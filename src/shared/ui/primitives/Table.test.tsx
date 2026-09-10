import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table } from './Table'

const here = dirname(fileURLToPath(import.meta.url))

type Row = { code: string; name: string; unit: string }

const COLUMNS = [
  { title: 'SKU', dataIndex: 'code', key: 'code' },
  { title: 'Descripción', dataIndex: 'name', key: 'name' },
  { title: 'Unidad', dataIndex: 'unit', key: 'unit' },
]

const ROWS: Row[] = [
  { code: 'SKU-001', name: 'Caja demo', unit: 'UN' },
  { code: 'SKU-002', name: 'Granel demo', unit: 'KG' },
]

function renderTable(props?: Partial<Parameters<typeof Table<Row>>[0]>) {
  return render(
    <Table<Row>
      scrollRegionLabel="Desplazar tabla horizontalmente"
      rowKey="code"
      columns={COLUMNS}
      dataSource={ROWS}
      {...props}
    />,
  )
}

describe('Table primitive (F3-PR2)', () => {
  it('renders a column header per column definition', () => {
    renderTable()
    expect(screen.getByRole('columnheader', { name: 'SKU' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Descripción' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Unidad' })).toBeInTheDocument()
  })

  it('renders one data row per record with its cell values', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getByRole('cell', { name: 'SKU-001' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'Granel demo' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'KG' })).toBeInTheDocument()
  })

  it('wraps the table in a keyboard-reachable labelled scroll region for narrow widths', () => {
    renderTable()
    const region = screen.getByRole('region', { name: 'Desplazar tabla horizontalmente' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(within(region).getByRole('table')).toBeInTheDocument()
  })

  it('renders an empty body without rows when the data source is empty', () => {
    renderTable({ dataSource: [] })
    expect(screen.getByRole('columnheader', { name: 'SKU' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'SKU-001' })).not.toBeInTheDocument()
  })

  it('carries no hardcoded brand hex or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'Table.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/borderRadius\s*[:=]\s*['"]?\d/)
  })
})
