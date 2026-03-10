import React, { ReactNode } from 'react';

// ============================================================================
// Premium Reusable Data Table Components
// Implementing clean architecture and modularization as per requirements.
// ============================================================================

export const TableWrapper: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`data-table-wrapper shadow-lg ${className}`}>
        {children}
    </div>
);

export const Table: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <table className={`data-table ${className}`}>
        {children}
    </table>
);

export const TableHeader: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <thead className={`bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] ${className}`}>
        {children}
    </thead>
);

export const TableBody: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <tbody className={`divide-y divide-[var(--border-primary)] ${className}`}>
        {children}
    </tbody>
);

export const TableFooter: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <tfoot className={`bg-[var(--bg-tertiary)]/50 border-t-2 border-[var(--border-primary)] font-bold ${className}`}>
        {children}
    </tfoot>
);

export const TableRow: React.FC<{ children: ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <tr
        className={`transition-colors hover:bg-[var(--accent-glow)] ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
    >
        {children}
    </tr>
);

export const TableHead: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`px-4 py-3.5 text-right font-black text-[0.7rem] uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap ${className}`}>
        {children}
    </th>
);

export const TableCell: React.FC<{ children: ReactNode; className?: string; colSpan?: number }> = ({ children, className = '', colSpan }) => (
    <td colSpan={colSpan} className={`px-4 py-3.5 text-sm text-[var(--text-primary)] align-middle ${className}`}>
        {children}
    </td>
);

// Optional: A high-level generic simple data table wrapper if needed for quick implementations
export interface ColumnDef<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => ReactNode;
    className?: string;
}

interface GenericDataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    keyExtractor: (item: T) => string | number;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
}

export function GenericDataTable<T>({ data, columns, keyExtractor, emptyMessage = "لا توجد بيانات متاحة", onRowClick }: GenericDataTableProps<T>) {
    return (
        <TableWrapper>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col, idx) => (
                            <TableHead key={idx} className={col.className}>
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? (
                        data.map((item) => (
                            <TableRow key={keyExtractor(item)} onClick={onRowClick ? () => onRowClick(item) : undefined}>
                                {columns.map((col, idx) => (
                                    <TableCell key={idx} className={col.className}>
                                        {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey]) : null}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-8 text-[var(--text-secondary)]">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableWrapper>
    );
}
