/**
 * filesystem-extra.js
 * FileSystem.importFromFiles and additional FS methods
 * ProCode IDE v3.0
 */

// ============================================
FileSystem.importFromFiles = async function(files, targetFolder = '') {
    const list = Array.from(files || []);
    if (!list.length) return { imported: 0, skipped: 0 };

    // Check conflicts once
    const conflicts = list
        .filter(f => f && f.name && this.exists((targetFolder ? (targetFolder + '/') : '') + (f.webkitRelativePath || f.name)));
    const overwriteAll = conflicts.length ? confirm(`Overwrite ${conflicts.length} existing file(s)?`) : false;

    let imported = 0, skipped = 0;

    for (const file of list) {
        if (!file) continue;
        const rel = file.webkitRelativePath || file.name;
        const filePath = targetFolder ? `${targetFolder}/${rel}` : rel;

        if (this.exists(filePath) && !overwriteAll) { skipped++; continue; }

        if (file.name && file.name.toLowerCase().endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                for (const [p, entry] of Object.entries(zip.files)) {
                    if (!entry.dir) {
                        // size cap guard (rough)
                        const content = await entry.async('string');
                        const fullPath = targetFolder ? `${targetFolder}/${p}` : p;
                        IDE.state.files[fullPath] = content;
                        imported++;
                    }
                }
            } catch (e) {
                Utils.toast(`ZIP import failed: ${file.name}`, 'error');
            }
            continue;
        }

        try {
            const content = await Utils.readFileSmart(file);
            IDE.state.files[filePath] = content;
            imported++;
            try { localStorage.setItem(`file_created_${filePath}`, new Date().toISOString()); } catch {}
        } catch (e) {
            skipped++;
        }
    }

    if (imported > 0) {
        this.save(true);
        this.refreshTree();
        Utils.toast(`Imported ${imported} file(s)${skipped ? `, skipped ${skipped}` : ''}`, 'success');
    } else {
        Utils.toast('No files imported', 'info');
    }

    return { imported, skipped };
};

// Drag & drop import that supports folders in Chromium (best-effort)
FileSystem.importFromDataTransfer = async function(dt, targetFolder = '') {
    if (!dt) return { imported: 0, skipped: 0 };

    // If modern FileSystemHandle API exists via items
    const items = Array.from(dt.items || []);
    const supportsHandles = items.some(i => i && typeof i.getAsFileSystemHandle === 'function');

    const collected = [];

    const readEntry = (entry, basePath) => new Promise((resolve) => {
        try {
            if (!entry) return resolve();
            if (entry.isFile) {
                entry.file((file) => {
                    file.__dropPath = basePath + file.name;
                    collected.push(file);
                    resolve();
                }, () => resolve());
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const readBatch = () => {
                    reader.readEntries(async (entries) => {
                        if (!entries || !entries.length) return resolve();
                        for (const e of entries) {
                            await readEntry(e, basePath + entry.name + '/');
                        }
                        readBatch();
                    }, () => resolve());
                };
                readBatch();
            } else {
                resolve();
            }
        } catch {
            resolve();
        }
    });

    if (supportsHandles) {
        // Currently, traversing handles recursively needs manual implementation; fallback to files list
        const files = Array.from(dt.files || []);
        return this.importFromFiles(files, targetFolder);
    }

    // Chromium legacy: webkitGetAsEntry for folder drops
    for (const it of items) {
        if (!it) continue;
        const entry = it.webkitGetAsEntry && it.webkitGetAsEntry();
        if (entry) await readEntry(entry, '');
    }

    if (collected.length) {
        // Map to paths if available
        const normalized = collected.map(f => {
            if (f.__dropPath) f.webkitRelativePath = f.__dropPath;
            return f;
        });
        return this.importFromFiles(normalized, targetFolder);
    }

    // Fallback
    return this.importFromFiles(Array.from(dt.files || []), targetFolder);
};

// ============================================
// ENHANCED EDITOR MANAGER