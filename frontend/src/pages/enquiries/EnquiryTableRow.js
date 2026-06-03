import React from 'react';
import { Badge } from '../../components/ui/badge';
import EnquiryThumbnail from './EnquiryThumbnail';

/**
 * One row of the Enquiries table. Wrapped in React.memo so React only re-renders
 * the rows whose underlying enquiry data (or list of visible stages) actually
 * changed — instead of all 20 rows on every page refresh, sort, or filter.
 */
function EnquiryTableRowImpl({ enq, visibleStages, page, pageSize, idx, onClick }) {
  // Stage value resolver kept inline so memo only depends on `enq` + `visibleStages`.
  const sv = enq.stage_values || {};
  const getVal = (sid) => {
    const v = sv[sid];
    if (!v) return '';
    return typeof v === 'object' ? v.value || '' : String(v);
  };

  return (
    <tr
      className="border-b cursor-pointer hover:bg-zinc-50 transition-colors group"
      onClick={onClick}
      data-testid={`enquiry-row-${enq.id}`}
    >
      {/* Sticky col 1: # */}
      <td className="p-2 text-zinc-500 text-xs font-mono sticky bg-white group-hover:bg-zinc-50 z-10" style={{ left: 0 }}>
        {enq.enquiry_number || (page - 1) * pageSize + idx + 1}
      </td>
      {/* Non-sticky: Img */}
      <td className="p-2">
        {enq.image_path ? <EnquiryThumbnail imagePath={enq.image_path} /> : <span className="text-zinc-300">—</span>}
      </td>
      {/* Non-sticky: Style No. */}
      <td className="p-2 text-zinc-600 text-sm">{enq.style_no || '—'}</td>
      {/* Sticky col 2: Customer */}
      <td className="p-2 font-medium text-zinc-900 sticky bg-white group-hover:bg-zinc-50 z-10 border-r-2 border-zinc-300" style={{ left: 50 }}>
        {enq.customer_name}
      </td>
      {/* Non-sticky: Fabric */}
      <td className="p-2 text-zinc-600">{enq.fabric_type}</td>
      {/* Stage columns */}
      {visibleStages.map(s => {
        const val = getVal(s.id);
        const delayStatus = enq.delay_status?.[s.id];
        const isDelayed = delayStatus === 'delayed' || delayStatus === 'completed_late';
        const isEarly = delayStatus === 'completed_early';
        return (
          <td key={s.id} className="p-2 text-xs">
            <div className="flex flex-col gap-0.5">
              {val ? (
                <Badge className="rounded-sm text-xs font-normal" style={{ backgroundColor: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>
                  {val}
                </Badge>
              ) : <span className="text-zinc-300">—</span>}
              {isDelayed && <span className="text-[10px] font-semibold text-red-600" data-testid={`delay-badge-${enq.id}-${s.id}`}>DELAYED</span>}
              {isEarly && <span className="text-[10px] font-semibold text-green-600" data-testid={`early-badge-${enq.id}-${s.id}`}>ON TIME</span>}
            </div>
          </td>
        );
      })}
      <td className="p-2 text-zinc-600 text-sm">{enq.rate || '—'}</td>
      <td className="p-2 text-zinc-600 text-xs">{enq.department || '—'}</td>
      <td className="p-2 text-xs">
        {enq.status === 'closed'
          ? <Badge className="rounded-sm text-[10px] bg-green-100 text-green-700 border border-green-200">Closed</Badge>
          : <Badge className="rounded-sm text-[10px] bg-blue-50 text-blue-600 border border-blue-200">Open</Badge>}
      </td>
      <td className="p-2 text-zinc-400 text-xs">{new Date(enq.created_at).toLocaleDateString()}</td>
    </tr>
  );
}

// Custom comparator: rows are pure functions of `enq` (identity) + `visibleStages`
// (identity, recomputed by parent via useMemo) + the row's row number context.
function areEqual(prev, next) {
  return (
    prev.enq === next.enq &&
    prev.visibleStages === next.visibleStages &&
    prev.page === next.page &&
    prev.pageSize === next.pageSize &&
    prev.idx === next.idx
  );
}

export default React.memo(EnquiryTableRowImpl, areEqual);
