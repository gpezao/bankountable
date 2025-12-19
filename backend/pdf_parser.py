"""Parser para cartolas bancarias en formato PDF"""
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
import pdfplumber
from PyPDF2 import PdfReader
from pdfminer.pdfdocument import PDFPasswordIncorrect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFParser:
    """Parser para extraer transacciones de cartolas bancarias PDF"""
    
    def __init__(self):
        # Cargar contraseñas desde variables de entorno
        pwd1 = os.getenv("PDF_PASSWORD_1", "0647")
        pwd2 = os.getenv("PDF_PASSWORD_2", "198306479")
        self.passwords = [pwd for pwd in [pwd1, pwd2] if pwd]  # Solo agregar si no están vacías
        logger.info(f"Contraseñas configuradas: {len(self.passwords)} contraseñas disponibles")
    
    def parse_pdf(self, file_path: str) -> List[Dict]:
        """
        Parsea un archivo PDF y extrae las transacciones
        
        Returns:
            Lista de diccionarios con las transacciones encontradas
        """
        transactions = []
        
        try:
            # Intentar abrir el PDF con pdfplumber
            pdf = None
            last_error = None
            
            # Primero intentar sin contraseña
            try:
                pdf = pdfplumber.open(file_path)
                logger.info("PDF abierto exitosamente sin contraseña")
            except PDFPasswordIncorrect:
                # PDF requiere contraseña
                logger.debug("PDF requiere contraseña, intentando con contraseñas disponibles...")
                last_error = None
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                # Si el error no es de contraseña, relanzar
                if "password" not in error_str and "encrypted" not in error_str and "decrypt" not in error_str:
                    logger.error(f"Error al abrir PDF (no es de contraseña): {e}")
                    raise
                logger.debug(f"PDF requiere contraseña, intentando con contraseñas disponibles...")
            
            # Si no se pudo abrir sin contraseña, intentar con cada contraseña
            if pdf is None:
                for password in self.passwords:
                    try:
                        pdf = pdfplumber.open(file_path, password=password)
                        logger.info(f"PDF abierto exitosamente con contraseña: {password}")
                        break
                    except PDFPasswordIncorrect:
                        # Esta contraseña no es correcta, intentar siguiente
                        logger.debug(f"Contraseña '{password}' incorrecta, intentando siguiente...")
                        last_error = PDFPasswordIncorrect("Contraseña incorrecta")
                        continue
                    except Exception as e:
                        last_error = e
                        error_str = str(e).lower()
                        # Si el error no es de contraseña, relanzar
                        if "password" not in error_str and "encrypted" not in error_str and "decrypt" not in error_str:
                            logger.error(f"Error al abrir PDF con contraseña '{password}' (no es de contraseña): {e}")
                            raise
                        logger.debug(f"Contraseña '{password}' incorrecta, intentando siguiente...")
                        continue
            
            # Si aún no se pudo abrir, intentar con PyPDF2 primero para desbloquear
            if pdf is None:
                logger.info("Intentando desbloquear PDF con PyPDF2...")
                try:
                    reader = PdfReader(file_path)
                    if reader.is_encrypted:
                        # Intentar desbloquear con cada contraseña disponible
                        decrypted = False
                        correct_password = None
                        for pwd in self.passwords:
                            try:
                                result = reader.decrypt(pwd)
                                # decrypt() devuelve 0 (falló), 1 (user password) o 2 (owner password)
                                if result in [1, 2]:
                                    correct_password = pwd
                                    decrypted = True
                                    logger.info(f"PDF desbloqueado con PyPDF2 usando contraseña: {pwd} (resultado: {result})")
                                    break
                                else:
                                    logger.debug(f"Contraseña '{pwd}' no desbloqueó el PDF (resultado: {result})")
                            except Exception as e:
                                logger.debug(f"Error al desbloquear con contraseña '{pwd}': {e}")
                                continue
                        
                        if not decrypted:
                            raise Exception("No se pudo desbloquear el PDF con ninguna contraseña disponible")
                        
                        # Si se desbloqueó exitosamente, intentar abrir con pdfplumber
                        pdf = pdfplumber.open(file_path, password=correct_password)
                        logger.info(f"PDF abierto con pdfplumber usando contraseña: {correct_password}")
                    else:
                        # No está encriptado, intentar abrir directamente
                        pdf = pdfplumber.open(file_path)
                        logger.info("PDF no está encriptado, abierto con pdfplumber")
                except Exception as e:
                    last_error = e
                    logger.error(f"Error al desbloquear PDF con PyPDF2: {e}")
                    # Continuar para que se lance el error final si no se pudo abrir
            
            if pdf is None:
                error_msg = f"No se pudo abrir el PDF con ninguna contraseña. Último error: {str(last_error)}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Intentar extraer tablas primero (más preciso)
            transactions = []
            
            for page in pdf.pages:
                # Intentar extraer tablas
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        table_transactions = self._parse_table(table)
                        transactions.extend(table_transactions)
            
            # Si no se encontraron transacciones en tablas, usar extracción de texto
            if not transactions:
                full_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text += text + "\n"
                
                text_transactions = self._parse_transactions_from_text(full_text)
                transactions.extend(text_transactions)
            
            pdf.close()
            
            # DEDUPLICACIÓN FINAL: Para cada (fecha, descripción), mantener solo la transacción con el monto mayor
            # Esto evita que se guarden múltiples transacciones para el mismo gasto
            final_transactions = []
            tx_by_key = {}  # (fecha, descripción) -> transacción con mayor monto
            
            for tx in transactions:
                # Normalizar descripción para comparación
                desc_normalized = tx.get('description', '').lower().strip()[:100]
                tx_key = (
                    str(tx.get('transaction_date')),
                    desc_normalized
                )
                
                if tx_key not in tx_by_key:
                    # Primera vez que vemos esta transacción
                    tx_by_key[tx_key] = tx
                else:
                    # Ya existe una transacción con esta fecha y descripción
                    # Mantener la que tenga el monto mayor
                    existing_amount = tx_by_key[tx_key].get('amount', 0)
                    current_amount = tx.get('amount', 0)
                    
                    if current_amount > existing_amount:
                        # Este monto es mayor, reemplazar
                        tx_by_key[tx_key] = tx
                        logger.debug(f"Reemplazando transacción {tx_key} con monto mayor: {current_amount} > {existing_amount}")
            
            final_transactions = list(tx_by_key.values())
            
            logger.info(f"Se encontraron {len(transactions)} transacciones en el PDF, {len(final_transactions)} después de deduplicación")
            
        except Exception as e:
            logger.error(f"Error al parsear PDF {file_path}: {e}")
            raise
        
        return final_transactions
    
    def _parse_table(self, table: List[List]) -> List[Dict]:
        """Parsea una tabla extraída del PDF"""
        transactions = []
        
        if not table or len(table) < 2:
            return transactions
        
        # Buscar fila de encabezados
        headers = None
        header_row_idx = 0
        for i, row in enumerate(table):
            if row and any(cell and ('fecha' in str(cell).lower() or 'descripcion' in str(cell).lower() or 'monto' in str(cell).lower() or 'importe' in str(cell).lower()) for cell in row if cell):
                headers = [str(cell).strip().lower() if cell else '' for cell in row]
                header_row_idx = i
                break
        
        if not headers:
            # Si no hay headers claros, analizar la estructura de la tabla
            # Buscar la columna que más se parece a montos (última columna con números grandes)
            if len(table) > 1:
                # Analizar primeras filas de datos para inferir estructura
                sample_rows = table[:min(10, len(table))]
                potential_monto_cols = []
                
                for col_idx in range(len(sample_rows[0]) if sample_rows else 0):
                    col_values = []
                    for row in sample_rows[1:]:  # Saltar header si existe
                        if col_idx < len(row) and row[col_idx]:
                            col_values.append(str(row[col_idx]).strip())
                    
                    # Contar cuántos valores parecen montos CLP válidos (con formato de miles)
                    monto_like_count = sum(1 for v in col_values if re.search(r'\d{1,3}(?:\.\d{3})+', v.replace('$', '').replace(' ', '')))
                    if monto_like_count > len(col_values) * 0.3:  # Al menos 30% parecen montos
                        potential_monto_cols.append((col_idx, monto_like_count))
                
                if potential_monto_cols:
                    # Usar la columna con más montos, preferiblemente la última
                    potential_monto_cols.sort(key=lambda x: (x[1], -x[0]), reverse=True)
                    monto_idx = potential_monto_cols[0][0]
                    fecha_idx = 0
                    desc_idx = 1 if len(sample_rows[0]) > 1 else 0
                else:
                    # Fallback: asumir formato estándar (fecha, descripción, monto)
                    fecha_idx = 0
                    desc_idx = 1 if len(sample_rows[0]) > 1 else 0
                    monto_idx = -1  # Última columna
            else:
                fecha_idx = 0
                desc_idx = 1
                monto_idx = -1
        else:
            # Buscar índices de columnas basándose en headers
            fecha_idx = None
            desc_idx = None
            monto_idx = None
            
            for i, header in enumerate(headers):
                header_lower = header.lower()
                if 'fecha' in header_lower or 'fec' in header_lower:
                    fecha_idx = i
                elif 'descripcion' in header_lower or 'concepto' in header_lower or 'detalle' in header_lower or 'glosa' in header_lower:
                    desc_idx = i
                elif 'monto' in header_lower or 'importe' in header_lower or 'valor' in header_lower or 'abono' in header_lower or 'cargo' in header_lower:
                    monto_idx = i
                elif 'saldo' in header_lower:
                    # Saldo no es un monto de transacción, ignorar
                    pass
            
            # Si no encontramos índices, usar posiciones por defecto
            if fecha_idx is None:
                fecha_idx = 0
            if desc_idx is None:
                # Buscar la columna más ancha (probablemente descripción)
                if len(headers) > 1:
                    desc_idx = 1
                else:
                    desc_idx = 0
            if monto_idx is None:
                monto_idx = -1  # Última columna
        
        # Procesar filas de datos
        seen_in_table = {}  # Dict: (fecha, descripción) -> monto máximo, para evitar duplicados dentro de la misma tabla
        
        for row in table[header_row_idx + 1:]:
            if not row:
                continue
            
            # Filtrar filas vacías o que sean solo separadores/headers repetidos
            row_content = [str(cell).strip() if cell else '' for cell in row]
            if not any(row_content):
                continue
            
            # Verificar que no sea un header repetido
            row_text = ' '.join(row_content).lower()
            if any(keyword in row_text for keyword in ['fecha', 'descripcion', 'monto', 'importe', 'saldo', 'total']):
                continue
            
            # Verificar que tengamos suficientes columnas
            max_col_idx = max(
                fecha_idx if fecha_idx is not None else 0,
                desc_idx if desc_idx is not None else 0,
                abs(monto_idx) if monto_idx < 0 else (monto_idx if monto_idx is not None else 0)
            )
            if len(row) <= max_col_idx:
                continue
            
            try:
                # Extraer fecha
                fecha_str = str(row[fecha_idx]).strip() if fecha_idx is not None and fecha_idx < len(row) and row[fecha_idx] else None
                if not fecha_str or len(fecha_str) < 5:
                    continue
                
                # Parsear fecha
                transaction_date = self._parse_date(fecha_str)
                if not transaction_date:
                    continue
                
                # Extraer descripción
                description = str(row[desc_idx]).strip() if desc_idx is not None and desc_idx < len(row) and row[desc_idx] else ''
                if not description or len(description) < 3:
                    continue
                
                # Filtrar descripciones que son solo números, símbolos o texto genérico
                desc_clean = description.replace('.', '').replace(',', '').replace('-', '').replace(' ', '').replace('$', '')
                if desc_clean.isdigit() or description.lower() in ['total', 'saldo', 'subtotal', '']:
                    continue
                
                # Extraer monto - SOLO de la columna de monto designada, NO de otras columnas
                actual_monto_idx = monto_idx if monto_idx >= 0 else len(row) + monto_idx
                
                # Asegurarse de que el índice sea válido
                if actual_monto_idx < 0 or actual_monto_idx >= len(row):
                    continue
                
                monto_str = str(row[actual_monto_idx]).strip() if row[actual_monto_idx] else None
                if not monto_str:
                    continue
                
                # CRÍTICO: Validar que el monto_str realmente parece un monto CLP válido
                # Debe tener formato de miles con puntos: 1.234, 12.345, 123.456, etc.
                monto_clean = monto_str.replace('$', '').replace(' ', '').replace(',', '')
                if not re.search(r'\d{1,3}(?:\.\d{3})+', monto_clean):
                    # Si no tiene formato de monto CLP con puntos de miles, NO es un monto válido
                    # Esto evita que números como "21", "10", "202", "5", "1" sean interpretados como montos
                    continue
                
                # Parsear el monto
                amount = self._parse_amount(monto_str)
                if amount is None:
                    continue
                
                # Filtrar saldos muy grandes (probablemente son saldos, no transacciones)
                if abs(amount) > 10000000:  # Más de 10 millones
                    continue
                
                # Filtrar montos muy pequeños - CRÍTICO para evitar números de fechas/texto
                # Solo aceptar montos >= $1.000 para evitar números que son parte de la descripción
                if abs(amount) < 1000:  # Menos de $1.000
                    continue
                
                # Crear clave única para esta transacción (solo fecha + descripción, sin monto para detectar duplicados de la misma transacción)
                tx_key_base = (
                    str(transaction_date),
                    description[:100].lower().strip()
                )
                
                # Si ya existe una transacción con la misma fecha y descripción, tomar solo la de mayor monto
                if tx_key_base in seen_in_table:
                    # Ya procesamos esta transacción, verificar si este monto es mayor
                    existing_amount = seen_in_table[tx_key_base]
                    if abs(amount) <= existing_amount:
                        continue  # Este monto es menor o igual, ignorar
                    # Este monto es mayor, reemplazar la transacción anterior
                    # (pero no podemos modificar la lista aquí, así que la agregamos y luego filtraremos)
                
                seen_in_table[tx_key_base] = abs(amount)
                
                transaction = {
                    'transaction_date': transaction_date,
                    'description': description[:500],
                    'merchant': self._extract_merchant(description),
                    'amount': abs(amount),
                    'payment_method': self._infer_payment_method(description),
                }
                transactions.append(transaction)
                
            except Exception as e:
                logger.debug(f"Error al procesar fila de tabla: {row} - {e}")
                continue
        
        # Filtrar transacciones duplicadas: para cada (fecha, descripción), mantener solo la de mayor monto
        final_transactions = []
        tx_by_key = {}
        
        for tx in transactions:
            tx_key = (
                str(tx['transaction_date']),
                tx['description'][:100].lower().strip()
            )
            
            if tx_key not in tx_by_key:
                tx_by_key[tx_key] = tx
            else:
                # Si este monto es mayor, reemplazar
                if tx['amount'] > tx_by_key[tx_key]['amount']:
                    tx_by_key[tx_key] = tx
        
        return list(tx_by_key.values())
    
    def _parse_date(self, date_str: str):
        """Parsea una fecha en diferentes formatos"""
        if not date_str:
            return None
        
        # Limpiar la fecha
        date_str = date_str.strip()
        
        # Patrones de fecha comunes
        patterns = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})',  # DD/MM/YYYY o DD-MM-YYYY
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',    # YYYY/MM/DD
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                try:
                    parts = match.groups()
                    if len(parts) == 3:
                        # Determinar formato
                        if len(parts[2]) == 4:  # YYYY al final
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                        elif len(parts[0]) == 4:  # YYYY al inicio
                            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                        else:  # Asumir DD/MM/YY
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                            if year < 100:
                                year += 2000
                        
                        if 1 <= month <= 12 and 1 <= day <= 31 and 2000 <= year <= 2100:
                            return datetime(year, month, day).date()
                except:
                    continue
        
        return None
    
    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parsea un monto en formato CLP"""
        if not amount_str:
            return None
        
        # Limpiar el monto
        amount_str = amount_str.strip()
        
        # Remover símbolos de moneda
        amount_str = amount_str.replace('$', '').replace('CLP', '').replace('CL', '').replace(' ', '').strip()
        
        # Validar que tenga formato de monto CLP (debe tener puntos como separadores de miles)
        # Un monto CLP válido DEBE tener puntos como separadores de miles (ej: 1.234, 12.345, 123.456)
        if not re.search(r'\d{1,3}(?:\.\d{3})+', amount_str):
            # Si no tiene formato de miles con puntos, NO es un monto CLP válido
            # Esto evita que números pequeños (como "21", "10", "202", "5", "1") sean interpretados como montos
            return None
        
        # Remover puntos (separadores de miles) y reemplazar coma por punto (decimal)
        # Formato CLP: 123.456,78 o 123.456
        if ',' in amount_str and '.' in amount_str:
            # Tiene decimales: 123.456,78
            amount_str = amount_str.replace('.', '').replace(',', '.')
        elif '.' in amount_str:
            # Verificar si el punto es separador de miles o decimal
            parts = amount_str.split('.')
            if len(parts) == 2 and len(parts[1]) <= 2:
                # Probablemente es decimal: 123.45
                amount_str = amount_str.replace(',', '')
            else:
                # Probablemente es separador de miles: 123.456
                amount_str = amount_str.replace('.', '').replace(',', '.')
        else:
            # Solo tiene coma, probablemente es decimal
            amount_str = amount_str.replace(',', '.')
        
        try:
            amount = float(amount_str)
            # Validación adicional: montos muy pequeños probablemente son errores
            # Solo aceptar montos >= $1.000 para evitar números que son parte de fechas o texto
            if amount < 1000:
                return None
            return amount
        except:
            return None
    
    def _parse_transactions_from_text(self, text: str) -> List[Dict]:
        """
        Extrae transacciones del texto del PDF
        Este método debe ser adaptado según el formato específico de las cartolas
        """
        transactions = []
        
        # Patrones comunes para transacciones bancarias chilenas
        # Formato típico: FECHA | DESCRIPCIÓN | MONTO
        
        # Buscar líneas que parezcan transacciones
        # Patrón para fechas: DD/MM/YYYY o DD-MM-YYYY
        date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        
        # Patrón para montos en CLP: $123.456 o 123.456 o -123.456
        # NOTA: Este patrón se usa solo para referencia, el parsing real usa clp_amount_pattern más estricto
        amount_pattern = r'[\$]?\s*([-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?)'
        
        lines = text.split('\n')
        
        current_date = None
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Buscar fecha en la línea
            date_match = re.search(date_pattern, line)
            if date_match:
                try:
                    date_str = date_match.group(1)
                    # Normalizar formato de fecha
                    if '/' in date_str:
                        parts = date_str.split('/')
                    else:
                        parts = date_str.split('-')
                    
                    if len(parts) == 3:
                        day = int(parts[0])
                        month = int(parts[1])
                        year = int(parts[2])
                        if year < 100:
                            year += 2000
                        current_date = datetime(year, month, day).date()
                except:
                    pass
            
            # Buscar montos en la línea - solo montos con formato CLP válido (con puntos de miles)
            # Patrón estricto: debe tener formato 123.456 o 123.456,78 (con puntos como separadores de miles)
            clp_amount_pattern = r'[\$]?\s*([-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?)'
            amount_matches = re.findall(clp_amount_pattern, line)
            
            if amount_matches and current_date:
                # Filtrar montos: solo tomar el que parece más un monto de transacción
                # (generalmente el más grande que tenga formato de miles y sea >= $1.000)
                valid_amounts = []
                for amount_str in amount_matches:
                    amount = self._parse_amount(amount_str)
                    # Solo aceptar montos >= $1.000 y <= $10.000.000
                    if amount and 1000 <= abs(amount) <= 10000000:
                        valid_amounts.append((amount_str, abs(amount)))
                
                # Si hay múltiples montos válidos, tomar el más grande (probablemente el correcto)
                if valid_amounts:
                    # Ordenar por monto descendente
                    valid_amounts.sort(key=lambda x: x[1], reverse=True)
                    # Tomar solo el monto principal (el más grande)
                    amount_str, amount = valid_amounts[0]
                    
                    # Extraer descripción (todo lo que no es fecha ni monto)
                    description = line
                    # Remover fecha
                    description = re.sub(date_pattern, '', description)
                    # Remover el monto específico que estamos usando
                    description = description.replace(amount_str, '', 1)
                    # Remover otros montos que puedan estar en la línea
                    description = re.sub(clp_amount_pattern, '', description)
                    description = description.strip()
                    
                    if description and len(description) > 3:
                        transaction = {
                            'transaction_date': current_date,
                            'description': description[:500],
                            'merchant': self._extract_merchant(description),
                            'amount': amount,
                            'payment_method': self._infer_payment_method(description),
                        }
                        transactions.append(transaction)
        
        # Si no se encontraron transacciones con el método anterior, intentar método alternativo
        if not transactions:
            transactions = self._parse_alternative_format(text)
        
        return transactions
    
    def _parse_alternative_format(self, text: str) -> List[Dict]:
        """Método alternativo de parsing para diferentes formatos de cartola"""
        transactions = []
        
        # Buscar tablas o estructuras más complejas
        # Este método puede ser expandido según los PDFs específicos
        
        # Patrón para líneas con: FECHA DESCRIPCIÓN MONTO
        pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([\$]?\s*[-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?)'
        
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            try:
                date_str = match.group(1)
                description = match.group(2).strip()
                amount_str = match.group(3)
                
                # Parsear fecha
                if '/' in date_str:
                    parts = date_str.split('/')
                else:
                    parts = date_str.split('-')
                
                if len(parts) == 3:
                    day = int(parts[0])
                    month = int(parts[1])
                    year = int(parts[2])
                    if year < 100:
                        year += 2000
                    transaction_date = datetime(year, month, day).date()
                    
                    # Parsear monto
                    amount_clean = amount_str.replace('$', '').replace('.', '').replace(',', '.').strip()
                    amount = float(amount_clean)
                    
                    if abs(amount) < 10000000 and len(description) > 3:
                        transaction = {
                            'transaction_date': transaction_date,
                            'description': description[:500],
                            'merchant': self._extract_merchant(description),
                            'amount': abs(amount),
                            'payment_method': self._infer_payment_method(description),
                        }
                        transactions.append(transaction)
            except Exception as e:
                logger.debug(f"Error en parsing alternativo: {e}")
                continue
        
        return transactions
    
    def _extract_merchant(self, description: str) -> Optional[str]:
        """Extrae el nombre del comercio de la descripción"""
        # Normalizar descripción
        desc = description.upper()
        
        # Comercios conocidos
        merchants = [
            'STARBUCKS', 'RAPPI', 'UBER EATS', 'PEDIDOS YA', 'MCDONALDS',
            'SUBWAY', 'FARMACIA AHUMADA', 'SHELL', 'COPEC', 'LIDER',
            'JUMBO', 'SANTANDER', 'FALABELLA', 'RIPLEY', 'PARIS'
        ]
        
        for merchant in merchants:
            if merchant in desc:
                return merchant.title()
        
        # Si no se encuentra, tomar las primeras palabras
        words = description.split()
        if len(words) > 0:
            return words[0][:50]
        
        return None
    
    def _infer_payment_method(self, description: str) -> str:
        """Infiere el método de pago basado en la descripción"""
        desc = description.upper()
        
        if any(word in desc for word in ['TARJETA', 'CREDITO', 'CREDIT', 'VISA', 'MASTERCARD']):
            return 'credit'
        elif any(word in desc for word in ['DEBITO', 'DEBIT', 'TRANSFERENCIA']):
            return 'debit'
        else:
            return 'credit'  # Default


