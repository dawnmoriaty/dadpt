import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    type Table as ReactTable,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { DataTablePagination } from './data-table-pagination'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchColumn?: string
    searchPlaceholder?: string
    /** Render prop receiving the table instance — use for custom toolbars with column visibility / filters */
    toolbar?: (table: ReactTable<TData>) => React.ReactNode
    /** If provided, enables manual (server-side) pagination */
    pageCount?: number
    /** Current page index (0-based) for server-side pagination */
    pageIndex?: number
    /** Page size for server-side pagination */
    pageSize?: number
    /** Callback for server-side pagination changes */
    onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    toolbar,
    pageCount,
    pageIndex: controlledPageIndex,
    pageSize: controlledPageSize,
    onPaginationChange,
}: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = useState({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [sorting, setSorting] = useState<SortingState>([])

    const isServerSide = pageCount !== undefined

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            ...(isServerSide && {
                pagination: {
                    pageIndex: controlledPageIndex ?? 0,
                    pageSize: controlledPageSize ?? 20,
                },
            }),
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        ...(isServerSide && {
            manualPagination: true,
            pageCount,
            onPaginationChange: (updater) => {
                if (!onPaginationChange) return
                const currentState = {
                    pageIndex: controlledPageIndex ?? 0,
                    pageSize: controlledPageSize ?? 20,
                }
                const newState =
                    typeof updater === 'function' ? updater(currentState) : updater
                onPaginationChange(newState.pageIndex, newState.pageSize)
            },
        }),
    })

    return (
        <div className="space-y-4">
            {toolbar?.(table)}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} colSpan={header.colSpan}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} />
        </div>
    )
}
