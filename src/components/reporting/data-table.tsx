"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

type DataTableProps<T> = Readonly<{
  data: readonly T[];
  columns: ColumnDef<T, unknown>[];
  filterPlaceholder?: string;
  globalFilterFn?: (row: T, filter: string) => boolean;
}>;

export function DataTable<T>({
  data,
  columns,
  filterPlaceholder = "Filter…",
  globalFilterFn,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return [...data];
    if (globalFilterFn) return data.filter((row) => globalFilterFn(row, q));
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [data, filter, globalFilterFn]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-sm print:hidden">
        <span className="text-muted-foreground text-xs">Filter</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={filterPlaceholder}
          className="border-input bg-background max-w-sm rounded-md border px-2 py-1.5"
        />
      </label>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} scope="col" className="px-3 py-2 font-semibold">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="hover:text-foreground text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-3 py-6 text-center"
                >
                  No rows
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
