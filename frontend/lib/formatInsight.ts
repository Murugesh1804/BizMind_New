/**
 * formatInsight
 * Converts raw LLM markdown text into styled HTML.
 *
 * Supported patterns:
 *  - **bold text**  → <strong>
 *  - - bullet line  → <li> inside <ul>
 *  - ### Heading    → <h4>
 *  - plain text     → <p>
 */
export function formatInsight(text: string): string {
    if (!text || text === 'No data available') return '';

    const lines = text.split('\n');
    const html: string[] = [];
    let inList = false;

    for (let raw of lines) {
        const line = raw.trim();
        if (!line) {
            if (inList) { html.push('</ul>'); inList = false; }
            continue;
        }

        // ### Heading
        if (/^#{1,4}\s/.test(line)) {
            if (inList) { html.push('</ul>'); inList = false; }
            const content = applyInline(line.replace(/^#{1,4}\s+/, ''));
            html.push(`<h4 class="insight-heading">${content}</h4>`);
            continue;
        }

        // Bullet point: -, *, •
        if (/^[-*•]\s+/.test(line)) {
            if (!inList) { html.push('<ul class="insight-list">'); inList = true; }
            const content = applyInline(line.replace(/^[-*•]\s+/, ''));
            html.push(`<li>${content}</li>`);
            continue;
        }

        // Numbered list
        if (/^\d+\.\s+/.test(line)) {
            if (inList) { html.push('</ul>'); inList = false; }
            if (!inList) { html.push('<ol class="insight-ol">'); inList = true; }
            const content = applyInline(line.replace(/^\d+\.\s+/, ''));
            html.push(`<li>${content}</li>`);
            continue;
        }

        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<p class="insight-para">${applyInline(line)}</p>`);
    }

    if (inList) html.push('</ul>');
    return html.join('\n');
}

/** Apply inline markdown: **bold**, *italic*, `code` */
function applyInline(text: string): string {
    return text
        // **bold**
        .replace(/\*\*(.+?)\*\*/g, '<strong class="insight-bold">$1</strong>')
        // *italic*
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // `code`
        .replace(/`(.+?)`/g, '<code class="insight-code">$1</code>');
}
