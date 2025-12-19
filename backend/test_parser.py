"""Script de prueba para analizar el parsing de PDFs"""
import sys
import os
from pdf_parser import PDFParser
import pdfplumber

def analyze_pdf(file_path):
    """Analiza un PDF y muestra su estructura"""
    print(f"\n{'='*60}")
    print(f"Analizando: {os.path.basename(file_path)}")
    print(f"{'='*60}\n")
    
    # Intentar abrir el PDF
    passwords = ["0647", "198306479", None]
    pdf = None
    
    for password in passwords:
        try:
            pdf = pdfplumber.open(file_path, password=password)
            print(f"✅ PDF abierto {'sin contraseña' if password is None else f'con contraseña: {password}'}\n")
            break
        except Exception as e:
            if "password" not in str(e).lower():
                print(f"❌ Error al abrir PDF: {e}")
                return
            continue
    
    if not pdf:
        print("❌ No se pudo abrir el PDF")
        return
    
    # Analizar estructura
    print(f"Total de páginas: {len(pdf.pages)}\n")
    
    for page_num, page in enumerate(pdf.pages[:3]):  # Solo primeras 3 páginas
        print(f"\n--- Página {page_num + 1} ---")
        
        # Extraer tablas
        tables = page.extract_tables()
        print(f"Tablas encontradas: {len(tables)}")
        
        for table_idx, table in enumerate(tables):
            print(f"\n  Tabla {table_idx + 1}: {len(table)} filas x {len(table[0]) if table else 0} columnas")
            
            if table and len(table) > 0:
                # Mostrar header
                print(f"  Header: {table[0]}")
                
                # Mostrar primeras 5 filas de datos
                print(f"  Primeras filas de datos:")
                for i, row in enumerate(table[1:6], 1):
                    print(f"    Fila {i}: {row}")
        
        # Extraer texto plano
        text = page.extract_text()
        if text:
            lines = text.split('\n')
            print(f"\n  Líneas de texto: {len(lines)}")
            print(f"  Primeras 10 líneas:")
            for i, line in enumerate(lines[:10], 1):
                if line.strip():
                    print(f"    {i}: {line[:80]}")
    
    pdf.close()
    
    # Ahora probar el parser
    print(f"\n{'='*60}")
    print("Probando parser...")
    print(f"{'='*60}\n")
    
    parser = PDFParser()
    try:
        transactions = parser.parse_pdf(file_path)
        print(f"✅ Transacciones encontradas: {len(transactions)}")
        
        if transactions:
            print(f"\nPrimeras 5 transacciones:")
            for i, tx in enumerate(transactions[:5], 1):
                print(f"  {i}. Fecha: {tx.get('transaction_date')}")
                print(f"     Descripción: {tx.get('description', '')[:60]}")
                print(f"     Monto: ${tx.get('amount', 0):,.0f}")
                print(f"     Comercio: {tx.get('merchant')}")
                print()
    except Exception as e:
        print(f"❌ Error al parsear: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Probar con un archivo de ejemplo
        file_path = "/app/data-samples/cartolas/ECBF_CC_202510_01-984-118087-4.pdf"
    
    analyze_pdf(file_path)

