# Convert Base44 entities to Supabase PostgreSQL schema
$entitiesDir = Join-Path $PSScriptRoot "..\base44\entities"
$outputFile = Join-Path $PSScriptRoot "..\supabase_schema.sql"

$files = Get-ChildItem -Path $entitiesDir -Filter "*.jsonc"

$sql = @"
-- =====================================================
-- Migration generated automatically from Base44 Entities
-- Target: Supabase (PostgreSQL)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

"@

function Get-MappedType($name, $prop) {
    if ($name -eq "id") { return "UUID PRIMARY KEY DEFAULT gen_random_uuid()" }
    $t = $prop.type
    $fmt = $prop.format
    if ($t -eq "string") {
        if ($fmt -eq "date") { return "DATE" }
        if ($fmt -eq "date-time") { return "TIMESTAMPTZ" }
        return "TEXT"
    }
    if ($t -eq "number" -or $t -eq "integer") {
        if ($null -ne $prop.default -and $prop.default -is [int]) {
            return "BIGINT"
        }
        return "NUMERIC"
    }
    if ($t -eq "boolean") {
        return "BOOLEAN"
    }
    if ($t -eq "array" -or $t -eq "object") {
        return "JSONB"
    }
    return "TEXT"
}

function Format-Default($val, $pgType) {
    if ($null -eq $val) { return "" }
    if ($pgType -eq "BOOLEAN") { return " DEFAULT " + ($val.ToString().ToLower()) }
    if ($pgType -eq "BIGINT" -or $pgType -eq "NUMERIC") { return " DEFAULT $val" }
    if ($pgType -eq "JSONB") {
        if ($val -is [Array] -and $val.Count -eq 0) {
            return " DEFAULT '[]'::jsonb"
        }
        $j = $val | ConvertTo-Json -Compress
        if (-not $j) { $j = "[]" }
        return " DEFAULT '$j'::jsonb"
    }
    return " DEFAULT '$val'"
}

foreach ($f in $files) {
    $raw = Get-Content -Path $f.FullName -Raw
    # Strip comments
    $cleaned = $raw -replace '//.*$', '' -replace '/\*[\s\S]*?\*/', ''
    $entity = $cleaned | ConvertFrom-Json

    $entityName = $entity.name
    if (-not $entityName) {
        $entityName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    }
    $tableName = $entityName.ToLower() + "s"

    $sql += @"
-- -----------------------------------------------------
-- Table: $tableName (from $($f.Name))
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.$tableName (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_id TEXT
"@

    $requiredList = @()
    if ($entity.required) { $requiredList = $entity.required }

    if ($entity.properties) {
        $props = $entity.properties.PSObject.Properties
        foreach ($p in $props) {
            $colName = $p.Name
            if ($colName -in @("id", "created_at", "updated_at")) { continue }

            $propDef = $p.Value
            $pgType = Get-MappedType $colName $propDef
            $defClause = Format-Default $propDef.default $pgType
            $notNull = ""
            if ($colName -in $requiredList -and $null -eq $propDef.default) {
                $notNull = " NOT NULL"
            }
            $sql += ",`n    `"$colName`" $pgType$defClause$notNull"
        }
    }

    $sql += @"

);

ALTER TABLE public.$tableName ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.$tableName;
CREATE POLICY "Allow authenticated read" ON public.$tableName FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.$tableName;
CREATE POLICY "Allow public read" ON public.$tableName FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete" ON public.$tableName;
CREATE POLICY "Allow authenticated insert/update/delete" ON public.$tableName FOR ALL TO authenticated USING (true);

"@
}

Set-Content -Path $outputFile -Value $sql -Encoding UTF8
Write-Output "Generated: $outputFile"
