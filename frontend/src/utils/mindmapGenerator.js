/**
 * Convert study plan text to SVG mindmap format
 */
export function generateMindmapSVG(planText, subject = 'Study Plan') {
  const structure = parsePlanStructure(planText, subject);
  return renderMindmapSVG(structure);
}

/**
 * Generate study plan as formatted text document (for PDF)
 */
export function generatePlanDocument(planText, subject = 'Study Plan') {
  const timestamp = new Date().toLocaleString();
  const structure = parsePlanStructure(planText, subject);
  
  let document = `STUDY PLAN - ${subject.toUpperCase()}\n`;
  document += `Generated on: ${timestamp}\n`;
  document += `${'='.repeat(60)}\n\n`;

  document += `FLOWCHART VIEW\n`;
  document += `${'-'.repeat(60)}\n`;
  document += `[${subject}]\n`;

  structure.branches.forEach((branch) => {
    document += `  |\n`;
    document += `  +--> [${branch.title}]\n`;

    if (!branch.items.length) {
      document += `        +--> (No items)\n`;
      return;
    }

    branch.items.forEach((step) => {
      document += `        +--> ${step}\n`;
    });
  });

  document += `\n`;
  document += `${'='.repeat(60)}\n`;
  document += `ORIGINAL PLAN\n`;
  document += `${'-'.repeat(60)}\n`;
  for (const line of planText.split('\n')) {
    document += `${line}\n`;
  }

  
  return document;
}

function parsePlanStructure(planText, subject) {
  const lines = planText.split('\n').map((line) => line.trim()).filter(Boolean);
  const structure = {
    title: subject,
    branches: [],
  };

  const headerPattern = /^(\d+[\)\.:-]\s+.+|day\s+\d+\b.*|week\s+\d+\b.*)$/i;
  const bulletPattern = /^(?:[\*\-\+•]\s+).+/;
  let currentBranch = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    const tableColumns = trimmed.split('|').map((part) => part.trim()).filter(Boolean);
    const isTableRow = trimmed.includes('|') && tableColumns.length >= 2 && !/^[-:]+$/.test(tableColumns[0]);
    const isHeaderLike = headerPattern.test(trimmed) || (/^[A-Z][A-Za-z0-9\s]{3,40}:$/.test(trimmed));

    if (isHeaderLike) {
      currentBranch = {
        title: trimmed.replace(/^\d+[\)\.:-]\s*/, '').replace(/:$/, ''),
        items: [],
      };
      structure.branches.push(currentBranch);
      continue;
    }

    if (isTableRow) {
      if (!currentBranch) {
        currentBranch = { title: 'Plan Steps', items: [] };
        structure.branches.push(currentBranch);
      }
      currentBranch.items.push(tableColumns.join(' - '));
      continue;
    }

    if (bulletPattern.test(trimmed)) {
      if (!currentBranch) {
        currentBranch = { title: 'Key Tasks', items: [] };
        structure.branches.push(currentBranch);
      }
      currentBranch.items.push(trimmed.replace(/^[\*\-\+•]\s*/, ''));
      continue;
    }

    if (!currentBranch) {
      currentBranch = { title: 'Overview', items: [] };
      structure.branches.push(currentBranch);
    }

    if (currentBranch.items.length && currentBranch.items[currentBranch.items.length - 1].length < 80) {
      currentBranch.items[currentBranch.items.length - 1] += ` ${trimmed}`;
    } else {
      currentBranch.items.push(trimmed);
    }
  }

  if (!structure.branches.length) {
    structure.branches.push({
      title: 'Plan Steps',
      items: lines.slice(0, 8),
    });
  }

  return structure;
}

function renderMindmapSVG(structure) {
  const branches = structure.branches.slice(0, 8).map((branch) => {
    const limitedItems = branch.items.slice(0, 6);
    const hiddenCount = Math.max(0, branch.items.length - limitedItems.length);
    if (hiddenCount > 0) {
      limitedItems.push(`+${hiddenCount} more tasks`);
    }
    return {
      title: branch.title,
      items: limitedItems,
    };
  });

  const startX = 80;
  const branchX = 360;
  const itemX = 700;
  const titleW = 190;
  const titleH = 56;
  const itemW = 410;
  const itemH = 50;
  const branchGap = 42;
  const itemGap = 16;
  const topPadding = 70;
  const rootY = 85;

  let totalHeight = topPadding + 80;
  branches.forEach((branch) => {
    const count = Math.max(1, branch.items.length);
    totalHeight += titleH + (count * (itemH + itemGap)) + branchGap;
  });

  const svgWidth = 1180;
  const svgHeight = Math.max(900, totalHeight + 30);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background:#f7f7fb">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,3 L0,6 z" fill="#7a70e8" />
    </marker>
    <style>
      .root-box { fill: #574db3; rx: 14; }
      .root-text { font-size: 22px; font-weight: 700; fill: #fff; }
      .branch-box { fill: #e9e7ff; stroke: #9c93fe; stroke-width: 2; rx: 12; }
      .branch-text { font-size: 15px; font-weight: 700; fill: #3f3696; }
      .item-box { fill: #ffffff; stroke: #b8b2ff; stroke-width: 1.5; rx: 10; }
      .item-text { font-size: 13px; fill: #2f2f45; }
      .flow-line { stroke: #8a80f0; stroke-width: 2; fill: none; marker-end: url(#arrow); }
    </style>
  </defs>
`;

  svg += `
  <rect x="${startX}" y="${rootY - 35}" width="220" height="70" class="root-box" />
  <text x="${startX + 110}" y="${rootY + 8}" text-anchor="middle" class="root-text">${escapeXml(structure.title)}</text>
`;

  let cursorY = topPadding;
  branches.forEach((branch) => {
    const itemCount = Math.max(1, branch.items.length);
    const sectionHeight = titleH + itemCount * (itemH + itemGap);
    const branchY = cursorY;
    const branchMidY = branchY + titleH / 2;

    svg += `
  <path d="M ${startX + 220} ${rootY} L ${branchX - 20} ${rootY} L ${branchX - 20} ${branchMidY} L ${branchX} ${branchMidY}" class="flow-line" />
  <rect x="${branchX}" y="${branchY}" width="${titleW}" height="${titleH}" class="branch-box" />
`;

    const titleLines = wrapText(branch.title, 22).slice(0, 2);
    titleLines.forEach((line, idx) => {
      const y = branchY + 22 + idx * 18;
      svg += `  <text x="${branchX + titleW / 2}" y="${y}" text-anchor="middle" class="branch-text">${escapeXml(line)}</text>\n`;
    });

    branch.items.forEach((item, itemIdx) => {
      const itemY = branchY + titleH + 10 + itemIdx * (itemH + itemGap);
      const itemMidY = itemY + itemH / 2;
      const elbowX = branchX + titleW + 24;

      svg += `
  <path d="M ${branchX + titleW} ${branchMidY} L ${elbowX} ${branchMidY} L ${elbowX} ${itemMidY} L ${itemX} ${itemMidY}" class="flow-line" />
  <rect x="${itemX}" y="${itemY}" width="${itemW}" height="${itemH}" class="item-box" />
`;

      const itemLines = wrapText(item, 52).slice(0, 2);
      itemLines.forEach((line, idx) => {
        const textY = itemY + 20 + idx * 17;
        svg += `  <text x="${itemX + 12}" y="${textY}" class="item-text">${escapeXml(line)}</text>\n`;
      });
    });

    cursorY += sectionHeight + branchGap;
  });

  svg += `\n</svg>`;
  return svg;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Trigger download of SVG mindmap
 */
export function downloadMindmap(svgContent, filename = 'study-plan-mindmap.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate and download study plan as HTML file (print-friendly as PDF)
 */
export function downloadPlanAsHTML(planText, subject = 'Study Plan') {
  const timestamp = new Date().toLocaleString();
  const lines = planText.split('\n');
  
  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)} - Study Plan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #574db3;
      margin-bottom: 10px;
      font-size: 28px;
      border-bottom: 3px solid #9c93fe;
      padding-bottom: 15px;
    }
    .meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 30px;
      font-style: italic;
    }
    h2 {
      color: #3f3696;
      margin-top: 25px;
      margin-bottom: 12px;
      font-size: 18px;
      border-left: 4px solid #9c93fe;
      padding-left: 12px;
    }
    p {
      margin-bottom: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      h1 { page-break-after: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(subject.toUpperCase())} - STUDY PLAN</h1>
    <div class="meta">Generated: ${timestamp}</div>
    
    <div class="content">`;

  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      htmlContent += '<br>';
      continue;
    }
    
    if (/^\d+\)/.test(trimmed)) {
      if (inSection) htmlContent += '</section>';
      htmlContent += `<h2>${escapeHtml(trimmed)}</h2>`;
      htmlContent += '<section>';
      inSection = true;
    } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('+')) {
      htmlContent += `<li>${escapeHtml(trimmed.replace(/^[\*\-\+]\s*/, ''))}</li>`;
    } else {
      htmlContent += `<p>${escapeHtml(line)}</p>`;
    }
  }
  
  htmlContent += `
    </div>
    ${inSection ? '</section>' : ''}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp_file = new Date().toISOString().slice(0, 10);
  link.download = `${subject}-study-plan-${timestamp_file}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Download study plan as text file
 */
export function downloadPlanAsText(planText, subject = 'Study Plan') {
  try {
    if (!planText) {
      console.error('No plan text provided');
      throw new Error('No plan text provided');
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    // Sanitize subject for filename - remove problematic characters
    const safeName = String(subject).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
    const filename = `${safeName}-study-plan-${timestamp}.txt`;
    
    const docText = generatePlanDocument(planText, subject);
    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (err) {
    console.error('Text download error:', err);
    throw err;
  }
}

