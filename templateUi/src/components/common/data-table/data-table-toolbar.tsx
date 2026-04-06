import { type Table } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { DataTableViewOptions } from './data-table-view-options'

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    searchPlaceholder?: string
    searchColumn?: string
    children?: React.ReactNode
}

export function DataTableToolbar<TData>({
    table,
    searchPlaceholder = 'Tìm kiếm...',
    searchColumn,
    children,
}: DataTableToolbarProps<TData>) {
    const column = searchColumn ? table.getColumn(searchColumn) : undefined
    const filterValue = (column?.getFilterValue() as string) ?? ''
    const isFiltered = table.getState().columnFilters.length > 0

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                {searchColumn && (
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={filterValue}
                            onChange={(event) => column?.setFilterValue(event.target.value)}
                            className="h-8 w-[150px] pl-9 lg:w-[250px]"
                        />
                    </div>
                )}
                {children}
                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Đặt lại
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
            <DataTableViewOptions table={table} />
        </div>
    )
}
