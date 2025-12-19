"""Servicios para interactuar con la base de datos"""
from typing import List, Optional, Dict
from datetime import date, datetime
from database import get_db_connection
import logging

logger = logging.getLogger(__name__)

class TransactionService:
    """Servicio para operaciones con transacciones"""
    
    @staticmethod
    def create_transaction(transaction_data: dict, tags: List[str] = None) -> int:
        """Crea una transacción y retorna su ID"""
        conn = get_db_connection()
        if not conn:
            raise Exception("No se pudo conectar a la base de datos")
        
        try:
            with conn.cursor() as cursor:
                sql = """
                    INSERT INTO transactions 
                    (account_id, import_id, transaction_date, description, merchant, 
                     amount, category_id, payment_method, raw_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    transaction_data.get('account_id'),
                    transaction_data.get('import_id'),
                    transaction_data.get('transaction_date'),
                    transaction_data.get('description'),
                    transaction_data.get('merchant'),
                    transaction_data.get('amount'),
                    transaction_data.get('category_id'),
                    transaction_data.get('payment_method'),
                    transaction_data.get('raw_data')
                ))
                transaction_id = cursor.lastrowid
                
                # Agregar etiquetas si existen
                if tags:
                    TransactionService._add_tags_to_transaction(cursor, transaction_id, tags)
                
                conn.commit()
                return transaction_id
        finally:
            conn.close()
    
    @staticmethod
    def _add_tags_to_transaction(cursor, transaction_id: int, tags: List[str]):
        """Agrega etiquetas a una transacción"""
        for tag_name in tags:
            # Obtener o crear el tag
            cursor.execute("SELECT id FROM tags WHERE name = %s", (tag_name,))
            tag = cursor.fetchone()
            if not tag:
                cursor.execute("INSERT INTO tags (name) VALUES (%s)", (tag_name,))
                tag_id = cursor.lastrowid
            else:
                tag_id = tag['id']
            
            # Relacionar transacción con tag
            cursor.execute(
                "INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (%s, %s)",
                (transaction_id, tag_id)
            )
    
    @staticmethod
    def get_transactions(
        category_id: Optional[int] = None,
        payment_method: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> List[Dict]:
        """Obtiene transacciones con filtros opcionales"""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cursor:
                conditions = []
                params = []
                
                if category_id:
                    conditions.append("t.category_id = %s")
                    params.append(category_id)
                
                if payment_method:
                    conditions.append("t.payment_method = %s")
                    params.append(payment_method)
                
                if start_date:
                    conditions.append("t.transaction_date >= %s")
                    params.append(start_date)
                
                if end_date:
                    conditions.append("t.transaction_date <= %s")
                    params.append(end_date)
                
                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
                
                sql = f"""
                    SELECT 
                        t.id, t.account_id, t.transaction_date, t.description, 
                        t.merchant, t.amount, t.category_id, t.payment_method,
                        t.created_at, t.updated_at,
                        c.name as category_name,
                        GROUP_CONCAT(tg.name) as tags
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
                    LEFT JOIN tags tg ON tt.tag_id = tg.id
                    {where_clause}
                    GROUP BY t.id, t.account_id, t.transaction_date, t.description, 
                             t.merchant, t.amount, t.category_id, t.payment_method,
                             t.created_at, t.updated_at, c.name
                    ORDER BY t.transaction_date DESC, t.id DESC
                    LIMIT %s OFFSET %s
                """
                params.extend([limit, offset])
                
                cursor.execute(sql, params)
                results = cursor.fetchall()
                
                # Procesar resultados
                transactions = []
                for row in results:
                    transaction = dict(row)
                    # Convertir tags de string a lista
                    if transaction.get('tags'):
                        transaction['tags'] = [t.strip() for t in transaction['tags'].split(',') if t.strip()]
                    else:
                        transaction['tags'] = []
                    # Asegurar que todos los campos requeridos estén presentes
                    if 'created_at' not in transaction:
                        transaction['created_at'] = datetime.now()
                    if 'updated_at' not in transaction:
                        transaction['updated_at'] = datetime.now()
                    transactions.append(transaction)
                
                return transactions
        finally:
            conn.close()
    
    @staticmethod
    def update_transaction(transaction_id: int, updates: dict) -> bool:
        """Actualiza una transacción"""
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                set_clauses = []
                params = []
                
                for key, value in updates.items():
                    if key != 'tags':
                        set_clauses.append(f"{key} = %s")
                        params.append(value)
                
                if set_clauses:
                    sql = f"UPDATE transactions SET {', '.join(set_clauses)} WHERE id = %s"
                    params.append(transaction_id)
                    cursor.execute(sql, params)
                    conn.commit()
                
                # Actualizar tags si se proporcionan
                if 'tags' in updates:
                    # Eliminar tags existentes
                    cursor.execute("DELETE FROM transaction_tags WHERE transaction_id = %s", (transaction_id,))
                    # Agregar nuevos tags
                    TransactionService._add_tags_to_transaction(cursor, transaction_id, updates['tags'])
                    conn.commit()
                
                return True
        finally:
            conn.close()
    
    @staticmethod
    def delete_transaction(transaction_id: int) -> bool:
        """Elimina una transacción"""
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                # Verificar que la transacción existe
                cursor.execute("SELECT id FROM transactions WHERE id = %s", (transaction_id,))
                if not cursor.fetchone():
                    return False
                
                # Eliminar la transacción (las relaciones con tags se eliminan automáticamente por CASCADE)
                cursor.execute("DELETE FROM transactions WHERE id = %s", (transaction_id,))
                conn.commit()
                return True
        finally:
            conn.close()

class StatsService:
    """Servicio para calcular estadísticas"""
    
    @staticmethod
    def get_stats(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict:
        """Calcula estadísticas de transacciones"""
        conn = get_db_connection()
        if not conn:
            return {}
        
        try:
            with conn.cursor() as cursor:
                conditions = []
                params = []
                
                if start_date:
                    conditions.append("transaction_date >= %s")
                    params.append(start_date)
                
                if end_date:
                    conditions.append("transaction_date <= %s")
                    params.append(end_date)
                
                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
                
                # Total
                cursor.execute(f"SELECT SUM(amount) as total, COUNT(*) as count FROM transactions {where_clause}", params)
                total_row = cursor.fetchone()
                total = float(total_row['total'] or 0)
                total_transactions = total_row['count'] or 0
                
                # Por categoría
                cursor.execute(f"""
                    SELECT c.name, SUM(t.amount) as total
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    {where_clause}
                    GROUP BY c.id, c.name
                    ORDER BY total DESC
                    LIMIT 10
                """, params)
                by_category = {row['name'] or 'Sin categoría': float(row['total'] or 0) for row in cursor.fetchall()}
                
                # Por comercio
                merchant_where = where_clause + (" AND merchant IS NOT NULL" if where_clause else "WHERE merchant IS NOT NULL")
                cursor.execute(f"""
                    SELECT merchant, SUM(amount) as total
                    FROM transactions
                    {merchant_where}
                    GROUP BY merchant
                    ORDER BY total DESC
                    LIMIT 10
                """, params)
                by_merchant = {row['merchant']: float(row['total'] or 0) for row in cursor.fetchall()}
                
                # Por método de pago
                payment_where = where_clause + (" AND payment_method IS NOT NULL" if where_clause else "WHERE payment_method IS NOT NULL")
                cursor.execute(f"""
                    SELECT payment_method, SUM(amount) as total
                    FROM transactions
                    {payment_where}
                    GROUP BY payment_method
                """, params)
                by_payment_method = {row['payment_method'] or 'unknown': float(row['total'] or 0) for row in cursor.fetchall()}
                
                # Top categorías
                top_categories = [
                    {'name': name, 'amount': amount}
                    for name, amount in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:5]
                ]
                
                # Top comercios
                top_merchants = [
                    {'name': name, 'amount': amount}
                    for name, amount in sorted(by_merchant.items(), key=lambda x: x[1], reverse=True)[:5]
                ]
                
                # Uso de crédito
                credit_total = by_payment_method.get('credit', 0)
                credit_usage = (credit_total / total * 100) if total > 0 else 0
                
                return {
                    'total': total,
                    'total_transactions': total_transactions,
                    'by_category': by_category,
                    'by_merchant': by_merchant,
                    'by_payment_method': by_payment_method,
                    'top_categories': top_categories,
                    'top_merchants': top_merchants,
                    'credit_usage': round(credit_usage, 1)
                }
        finally:
            conn.close()

class CategoryService:
    """Servicio para operaciones con categorías"""
    
    @staticmethod
    def get_all() -> List[Dict]:
        """Obtiene todas las categorías"""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM categories ORDER BY name")
                return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def create(name: str, description: Optional[str] = None) -> int:
        """Crea una nueva categoría"""
        conn = get_db_connection()
        if not conn:
            raise Exception("No se pudo conectar a la base de datos")
        
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO categories (name, description) VALUES (%s, %s)",
                    (name, description)
                )
                conn.commit()
                return cursor.lastrowid
        finally:
            conn.close()
    
    @staticmethod
    def update(category_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        """Actualiza una categoría"""
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                updates = []
                params = []
                
                if name:
                    updates.append("name = %s")
                    params.append(name)
                
                if description is not None:
                    updates.append("description = %s")
                    params.append(description)
                
                if updates:
                    params.append(category_id)
                    sql = f"UPDATE categories SET {', '.join(updates)} WHERE id = %s"
                    cursor.execute(sql, params)
                    conn.commit()
                    return True
                return False
        finally:
            conn.close()
    
    @staticmethod
    def delete(category_id: int) -> bool:
        """Elimina una categoría"""
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM categories WHERE id = %s", (category_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            conn.close()

class TagService:
    """Servicio para operaciones con etiquetas"""
    
    @staticmethod
    def get_all() -> List[Dict]:
        """Obtiene todas las etiquetas"""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM tags ORDER BY name")
                return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def create(name: str) -> int:
        """Crea una nueva etiqueta"""
        conn = get_db_connection()
        if not conn:
            raise Exception("No se pudo conectar a la base de datos")
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("INSERT IGNORE INTO tags (name) VALUES (%s)", (name,))
                conn.commit()
                # Obtener el ID
                cursor.execute("SELECT id FROM tags WHERE name = %s", (name,))
                tag = cursor.fetchone()
                return tag['id'] if tag else None
        finally:
            conn.close()
    
    @staticmethod
    def delete(tag_id: int) -> bool:
        """Elimina una etiqueta"""
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM tags WHERE id = %s", (tag_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            conn.close()

