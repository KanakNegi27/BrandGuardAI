import React from 'react';

export default function PassageHighlighter({ text, findings = [], selectedFindingId, onSelectFinding }) {
  if (!text) {
    return <span className="text-slate-400 italic">No content available to preview.</span>;
  }

  // Filter open findings that have valid affected_text
  const activeFindings = findings.filter(f => f.status === 'open' && f.affected_text);

  if (activeFindings.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed text-slate-800">{text}</div>;
  }

  // Find occurrences of findings in text and build segments
  let matches = [];
  activeFindings.forEach(f => {
    const target = f.affected_text;
    let startIndex = 0;
    while ((startIndex = text.indexOf(target, startIndex)) !== -1) {
      matches.push({
        finding: f,
        start: startIndex,
        end: startIndex + target.length
      });
      startIndex += target.length;
    }
  });

  // Sort by start position
  matches.sort((a, b) => a.start - b.start);

  // Eliminate overlapping intervals
  const nonOverlapping = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }

  // Construct text chunks
  const chunks = [];
  let cursor = 0;

  nonOverlapping.forEach((m, idx) => {
    if (m.start > cursor) {
      chunks.push({
        type: 'text',
        content: text.slice(cursor, m.start),
        key: `txt-${cursor}`
      });
    }

    chunks.push({
      type: 'highlight',
      finding: m.finding,
      content: text.slice(m.start, m.end),
      key: `hl-${m.finding.id}-${idx}`
    });

    cursor = m.end;
  });

  if (cursor < text.length) {
    chunks.push({
      type: 'text',
      content: text.slice(cursor),
      key: `txt-end`
    });
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-slate-800 text-sm">
      {chunks.map((chunk) => {
        if (chunk.type === 'text') {
          return <span key={chunk.key}>{chunk.content}</span>;
        }

        const f = chunk.finding;
        const isSelected = selectedFindingId === f.id;
        const sevClass = f.severity === 'Critical' ? 'highlight-critical' :
                         f.severity === 'High' ? 'highlight-high' :
                         f.severity === 'Medium' ? 'highlight-medium' : 'highlight-low';

        return (
          <mark
            key={chunk.key}
            onClick={() => onSelectFinding && onSelectFinding(f)}
            className={`${sevClass} ${isSelected ? 'highlight-active ring-2 ring-teal-600 font-medium' : ''} transition-all`}
            title={`${f.issue_category} (${f.severity}): ${f.explanation}`}
          >
            {chunk.content}
          </mark>
        );
      })}
    </div>
  );
}
