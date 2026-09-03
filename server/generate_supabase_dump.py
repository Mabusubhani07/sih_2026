import sqlite3
import re
from datetime import datetime, timezone

conn = sqlite3.connect('prisma/dev.db')
cur = conn.cursor()

with open('supabase_schema.sql', 'r', encoding='utf-8') as f:
    schema_sql = f.read()

table_order = [
    'Organization',
    'Department',
    'User',
    'Case',
    'CaseMembership',
    'Document',
    'DocumentMetadata',
    'DocumentVersion',
    'Evidence',
    'DocumentShare',
    'Notification',
    'AuditLog'
]

datetime_cols = {
    'createdAt', 'documentDate', 'verifiedAt', 'updatedAt', 'timestamp', 
    'revokedAt', 'addedAt', 'incidentDate', 'registeredDate', 'collectedDate', 
    'expiresAt', 'lastLogin'
}

boolean_cols = {'isVerified', 'isConfidential', 'isRead', 'isOcrProcessed'}

def format_val(col_name, val):
    if val is None:
        return "NULL"
    if col_name in boolean_cols:
        return "TRUE" if val else "FALSE"
    if col_name in datetime_cols:
        if isinstance(val, (int, float)) or (isinstance(val, str) and val.isdigit()):
            val_ms = int(val)
            if val_ms > 100000000000:
                dt = datetime.fromtimestamp(val_ms / 1000.0, tz=timezone.utc)
            else:
                dt = datetime.fromtimestamp(val_ms, tz=timezone.utc)
            return f"'{dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}'"
        else:
            escaped = str(val).replace("'", "''")
            return f"'{escaped}'"
    if isinstance(val, (int, float)):
        return str(val)
    
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

output = []
output.append("-- ========================================================")
output.append("-- DIEMP INVESTIGATION PLATFORM - COMPLETE SUPABASE SETUP")
output.append("-- Paste this entire script into Supabase SQL Editor and click RUN")
output.append("-- ========================================================\n")
output.append(schema_sql)
output.append("\n-- ========================================================")
output.append("-- SEED DATA INSERTION")
output.append("-- ========================================================\n")

for table in table_order:
    cur.execute(f'PRAGMA table_info("{table}")')
    cols_info = cur.fetchall()
    col_names = [c[1] for c in cols_info]
    
    cur.execute(f'SELECT * FROM "{table}"')
    rows = cur.fetchall()
    if not rows:
        continue
    
    output.append(f"-- Data for {table} ({len(rows)} records)")
    for row in rows:
        val_strs = [format_val(col_name, val) for col_name, val in zip(col_names, row)]
        quoted_cols = ', '.join([f'"{c}"' for c in col_names])
        vals_joined = ', '.join(val_strs)
        output.append(f'INSERT INTO "{table}" ({quoted_cols}) VALUES ({vals_joined}) ON CONFLICT DO NOTHING;')
    output.append("")

with open('supabase_complete_setup.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Successfully regenerated server/supabase_complete_setup.sql with valid PostgreSQL timestamps")
