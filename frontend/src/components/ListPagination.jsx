import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Simple prev/next pagination for envelope and document lists.
 * @param {{ page: number, total: number, pageSize: number, onPageChange: (page: number) => void, testId?: string }} props
 */
export function ListPagination({ page, total, pageSize, onPageChange, testId = "list-pagination" }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-border)] px-5 py-3"
      data-testid={testId}
    >
      <p className="text-xs text-[var(--c-muted-fg)]">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          data-testid={`${testId}-prev`}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
        </Button>
        <span className="text-xs font-medium text-[var(--c-ink)]" data-testid={`${testId}-page`}>
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid={`${testId}-next`}
        >
          Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Slice a filtered array for client-side pagination. */
export function paginateItems(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}