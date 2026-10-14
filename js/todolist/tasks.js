/**
 * tasks.js — Task rendering and task modal management
 */

const Tasks = (() => {

  // Helper for video duration
  function formatHM(raw) {
    if (typeof window.parseDurationToHM === 'function') {
      return window.parseDurationToHM(raw);
    }
    return raw || '';
  }

  // -- Task row builder -----------------------------------

  function buildTaskRow(task, opts = {}) {
    // opts: { showDate, showProject, isRecurrence, dateStr, showArchiveBtn }
    const { showDate = false, showProject = true, isRecurrence = false, dateStr, showArchiveBtn = false } = opts;

    const row = document.createElement('li');
    row.className = `task-row${task.status === 'completed' ? ' completed' : ''}`;
    row.dataset.id = task.id;
    row.dataset.recurrence = isRecurrence ? '1' : '0';
    if (isRecurrence) row.dataset.dateStr = dateStr;
    row.setAttribute('draggable', !isRecurrence);
    row.setAttribute('role', 'listitem');
    row.setAttribute('tabindex', '0');

    // Checkbox
    const check = document.createElement('button');
    check.className = `task-check${task.status === 'completed' ? ' done' : task.status === 'in-progress' ? ' in-progress' : ''}`;
    check.setAttribute('aria-label', task.status === 'completed' ? 'Mark incomplete' : 'Mark complete');
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', task.status === 'completed' ? 'true' : 'false');
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      handleComplete(task.id, isRecurrence, dateStr, row, check);
    });

    // Body
    const body = document.createElement('div');
    body.className = 'task-body';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    body.appendChild(title);

    // Meta
    const meta = document.createElement('div');
    meta.className = 'task-meta';

    // Subtask preview
    if (task.subtasks && task.subtasks.length > 0) {
      const done = task.subtasks.filter(s => s.completed).length;
      const preview = document.createElement('span');
      preview.className = 'task-subtask-preview';
      preview.textContent = `${done}/${task.subtasks.length}`;
      meta.appendChild(preview);
    }

    // Duration
    if (task.estimatedMinutes) {
      const dur = document.createElement('span');
      dur.className = 'task-duration';
      dur.textContent = Utils.formatDuration(task.estimatedMinutes);
      meta.appendChild(dur);
    }

    // Date (if showDate)
    if (showDate && task.plannedDate) {
      const dateEl = document.createElement('span');
      dateEl.className = `task-time${Utils.isOverdue(task.plannedDate) && task.status !== 'completed' ? ' overdue' : ''}`;
      dateEl.textContent = Utils.formatDisplayDate(task.plannedDate);
      meta.appendChild(dateEl);
    }

    // Time
    if (task.time) {
      const timeEl = document.createElement('span');
      timeEl.className = 'task-time';
      timeEl.textContent = Utils.formatTime(task.time);
      meta.appendChild(timeEl);
    }

    // Priority dot
    if (task.priority === 'important') {
      const dot = document.createElement('span');
      dot.className = 'task-priority-dot';
      dot.setAttribute('aria-label', 'Important');
      dot.title = 'Important';
      meta.appendChild(dot);
    }

    // Project tag
    if (showProject && task.projectId) {
      const proj = Store.getProject(task.projectId);
      if (proj) {
        const tag = document.createElement('span');
        tag.className = 'task-project-tag';
        tag.textContent = proj.name;
        meta.appendChild(tag);
      }
    }

    // Task-type badge + inline data
    const typeIcons = { video: '🎥', homework: '📝', revision: '🔄', sheet: '📑', exam: '📊' };
    if (task.taskType && task.taskType !== 'general' && typeIcons[task.taskType]) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'task-type-badge';
      typeBadge.textContent = typeIcons[task.taskType];
      typeBadge.title = task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1);
      meta.appendChild(typeBadge);
    }

    // Video duration pill
    if (task.videoDuration) {
      const dp = document.createElement('span');
      dp.className = 'task-type-badge';
      dp.style.cssText = 'background:rgba(99,102,241,.14);color:#818cf8;font-size:10px;border-radius:4px;padding:2px 6px;font-weight:700';
      dp.textContent = '⏱ ' + formatHM(task.videoDuration);
      meta.appendChild(dp);
    }

    // Homework ranges + score
    const rngs = Array.isArray(task.hwRanges) && task.hwRanges.length ? task.hwRanges : (task.hwPages ? (typeof task.hwPages === 'string' ? task.hwPages.split(',').map(s=>s.trim()).filter(Boolean) : [task.hwPages]) : []);
    if (rngs.length) {
      rngs.forEach(function(r) {
        const p = document.createElement('span');
        p.className = 'task-type-badge';
        p.style.cssText = 'background:rgba(245,158,11,.14);color:#f59e0b;font-size:10px;border-radius:4px;padding:2px 6px;font-weight:700';
        p.textContent = '📖 ' + r;
        meta.appendChild(p);
      });
    }
    if (task.hwScore) {
      const sc = document.createElement('span');
      sc.className = 'task-type-badge';
      sc.style.cssText = 'background:rgba(16,185,129,.14);color:#10b981;font-size:10px;border-radius:4px;padding:2px 6px;font-weight:700';
      sc.textContent = '✅ ' + task.hwScore;
      meta.appendChild(sc);
    }

    body.appendChild(meta);

    // Actions (hover)
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.title = 'Edit';
    editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 2L11 3.5 4 10.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(task.id);
    });

    // Archive button (for any task in a project or when requested, whether done or undone)
    if (showArchiveBtn || task.projectId) {
      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'task-action-btn admin-only';
      archiveBtn.setAttribute('aria-label', 'Archive task');
      archiveBtn.title = 'Archive';
      archiveBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3h10v2H2V3zm1 2v6a1 1 0 001 1h6a1 1 0 001-1V5H3zm3 2h2v2H6V7z" fill="currentColor"/></svg>`;
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.archiveTask(task.id);
        App.refresh();
        UI.toast('Task archived.');
      });
      actions.appendChild(archiveBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn danger';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2.5h4v1M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(task.id, isRecurrence, dateStr, row);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(check);
    row.appendChild(body);
    row.appendChild(actions);

    // Row click -> open details
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-check') || e.target.closest('.task-action-btn')) return;
      UI.openDetails(task.id, isRecurrence, dateStr);
    });

    // Drag-and-drop (tasks only, not recurrences)
    if (!isRecurrence) {
      setupDragEvents(row, task.id);
    }

    // Keyboard navigation
    row.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleComplete(task.id, isRecurrence, dateStr, row, check);
      } else if (e.key === 'Enter') {
        UI.openDetails(task.id, isRecurrence, dateStr);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isRecurrence) {
          handleDelete(task.id, isRecurrence, dateStr, row);
        }
      }
    });

    return row;
  }

  // Recurrence task row
  function buildRecurrenceRow(recurrence, dateStr, opts = {}) {
    const isCompleted = Store.getRecurrencesForDate(dateStr)
      .find(r => r.id === recurrence.id)?.completed || false;

    const pseudoTask = {
      id: recurrence.id,
      title: recurrence.title,
      notes: recurrence.notes,
      priority: recurrence.priority,
      status: isCompleted ? 'completed' : 'pending',
      plannedDate: dateStr,
      time: recurrence.time,
      estimatedMinutes: recurrence.estimatedMinutes,
      projectId: recurrence.projectId,
      recurrenceId: recurrence.id,
      subtasks: [],
    };

    return buildTaskRow(pseudoTask, { ...opts, isRecurrence: true, dateStr });
  }

  // -- Completion handler ---------------------------------

  function handleComplete(taskId, isRecurrence, dateStr, rowEl, checkEl) {
    if (isRecurrence) {
      Store.toggleRecurrenceCompletion(taskId, dateStr);
      App.refresh();
      return;
    }

    const task = Store.getTask(taskId);
    if (!task) return;

    const isCompleting = task.status !== 'completed';

    if (isCompleting) {
      rowEl.classList.add('completing');
      checkEl.classList.add('done');
      checkEl.setAttribute('aria-checked', 'true');

      setTimeout(() => {
        Store.completeTask(taskId);
        App.refresh();
      }, 250);
    } else {
      Store.completeTask(taskId);
      App.refresh();
    }
  }

  // -- Delete handler -------------------------------------

  function handleDelete(taskId, isRecurrence, dateStr, rowEl) {
    if (isRecurrence) return;

    rowEl.style.transition = 'opacity 150ms ease, transform 150ms ease';
    rowEl.style.opacity = '0';
    rowEl.style.transform = 'translateX(8px)';

    setTimeout(() => {
      Store.deleteTask(taskId);
      App.refresh();
      UI.toast('Task deleted.');
    }, 150);
  }

  // -- Drag and drop --------------------------------------

  let draggedId = null;

  function setupDragEvents(rowEl, taskId) {
    rowEl.addEventListener('dragstart', (e) => {
      draggedId = taskId;
      rowEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
    });

    rowEl.addEventListener('dragend', () => {
      rowEl.classList.remove('dragging');
      draggedId = null;
      document.querySelectorAll('.task-row.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    rowEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedId && draggedId !== taskId) {
        rowEl.classList.add('drag-over');
      }
    });

    rowEl.addEventListener('dragleave', () => {
      rowEl.classList.remove('drag-over');
    });

    rowEl.addEventListener('drop', (e) => {
      e.preventDefault();
      rowEl.classList.remove('drag-over');
      if (draggedId && draggedId !== taskId) {
        Store.reorderTask(draggedId, taskId);
        App.refresh();
      }
    });
  }

  function getDragId() { return draggedId; }

  // -- Modal & Type Switching -----------------------------

  let editingTaskId = null;
  let defaultDate = null;
  let defaultProjectId = null;

  function setTaskType(type) {
    type = type || 'general';
    const radios = document.querySelectorAll('input[name="task-type"]');
    radios.forEach(r => {
      const isMatch = r.value === type;
      r.checked = isMatch;
      const chipLabel = r.closest('.task-type-chip');
      if (chipLabel) {
        chipLabel.classList.toggle('active', isMatch);
        chipLabel.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      }
    });

    const videoExtra = document.getElementById('type-extra-video');
    const hwExtra = document.getElementById('type-extra-homework');
    const examExtra = document.getElementById('type-extra-exam');

    if (videoExtra) videoExtra.style.display = (type === 'video') ? 'block' : 'none';
    if (hwExtra) hwExtra.style.display = (type === 'homework') ? 'block' : 'none';
    if (examExtra) examExtra.style.display = (type === 'exam') ? 'block' : 'none';
  }

  function openCreateModal(opts = {}) {
    editingTaskId = null;
    defaultDate = opts.date || null;
    defaultProjectId = opts.projectId || null;

    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleEl = document.getElementById('modal-title');
    const submitEl = document.getElementById('modal-submit-btn');

    const isAr = window.lang === 'ar';
    titleEl.textContent = isAr ? 'مهمة جديدة' : 'New task';
    submitEl.textContent = isAr ? 'إضافة مهمة' : 'Add task';
    const cancelEl = document.getElementById('modal-cancel-btn');
    if (cancelEl) cancelEl.textContent = isAr ? 'إلغاء' : 'Cancel';
    form.reset();

    // Reset task type to general or provided type
    setTaskType(opts.taskType || 'general');

    // Reset hw ranges and tags
    window._hwRanges = [];
    if (typeof window.renderHwRangeTags === 'function') window.renderHwRangeTags();
    const hwT = document.getElementById('hw-ranges-tags');
    if (hwT) hwT.innerHTML = '';
    const hwInp = document.getElementById('hw-range-input');
    if (hwInp) hwInp.value = '';
    const hwSc = document.getElementById('task-hw-score');
    if (hwSc) hwSc.value = '';

    // Reset video fields
    const vlnk = document.getElementById('task-video-link');
    if (vlnk) vlnk.value = '';
    const vdTxt = document.getElementById('task-video-duration');
    if (vdTxt) vdTxt.value = '';
    const vdS = document.getElementById('task-video-duration-select');
    if (vdS) vdS.value = '';

    // Reset exam fields
    const exScore = document.getElementById('task-exam-score');
    if (exScore) exScore.value = '';
    const exLoc = document.getElementById('task-exam-location');
    if (exLoc) exLoc.value = 'school';

    // Pre-fill date
    if (defaultDate) {
      document.getElementById('task-date-input').value = defaultDate;
    }

    // Populate project select
    populateProjectSelect(defaultProjectId);

    // Hide recurrence extra
    document.getElementById('recurrence-days-wrap').style.display = 'none';

    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('task-title-input').focus();
  }

  function openEditModal(taskId) {
    const task = Store.getTask(taskId);
    if (!task) return;

    editingTaskId = taskId;
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleEl = document.getElementById('modal-title');
    const submitEl = document.getElementById('modal-submit-btn');

    const isAr = window.lang === 'ar';
    titleEl.textContent = isAr ? 'تعديل المهمة' : 'Edit task';
    submitEl.textContent = isAr ? 'حفظ التعديلات' : 'Save changes';
    const cancelEl = document.getElementById('modal-cancel-btn');
    if (cancelEl) cancelEl.textContent = isAr ? 'إلغاء' : 'Cancel';
    form.reset();

    document.getElementById('task-title-input').value = task.title || '';
    document.getElementById('task-date-input').value = task.plannedDate || '';
    document.getElementById('task-time-input').value = task.time || '';
    document.getElementById('task-duration-select').value = task.estimatedMinutes || '';
    document.getElementById('task-notes-input').value = task.notes || '';

    const priorityRadios = form.querySelectorAll('input[name="task-priority"]');
    priorityRadios.forEach(r => { r.checked = r.value === task.priority; });

    populateProjectSelect(task.projectId);
    document.getElementById('task-recurrence-select').value = '';
    document.getElementById('recurrence-days-wrap').style.display = 'none';

    // Set task type and show respective extras
    setTaskType(task.taskType || 'general');

    // Restore hw ranges
    if (Array.isArray(task.hwRanges) && task.hwRanges.length) {
      window._hwRanges = task.hwRanges.slice();
    } else if (task.hwPages) {
      window._hwRanges = typeof task.hwPages === 'string'
        ? task.hwPages.split(',').map(s => s.trim()).filter(Boolean)
        : [String(task.hwPages)];
    } else {
      window._hwRanges = [];
    }
    if (typeof window.renderHwRangeTags === 'function') window.renderHwRangeTags();

    const hwSc = document.getElementById('task-hw-score');
    if (hwSc) hwSc.value = task.hwScore || '';

    // Restore video fields
    const vlnk = document.getElementById('task-video-link');
    if (vlnk) vlnk.value = task.videoLink || '';
    const vdTxt = document.getElementById('task-video-duration');
    if (vdTxt) vdTxt.value = task.videoDuration ? formatHM(task.videoDuration) : '';
    const vdSel = document.getElementById('task-video-duration-select');
    if (vdSel) vdSel.value = task.videoDurationSelect || '';

    // Restore exam fields
    const exScore = document.getElementById('task-exam-score');
    if (exScore) exScore.value = task.examScore || '';
    const exLoc = document.getElementById('task-exam-location');
    if (exLoc) exLoc.value = task.examLocation || 'school';

    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('task-title-input').focus();
  }

  function closeModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingTaskId = null;
  }

  function populateProjectSelect(selectedId) {
    const sel = document.getElementById('task-project-select');
    const projects = Store.getProjects();
    const isAr = window.lang === 'ar';
    sel.innerHTML = `<option value="">${isAr ? 'بدون مشروع' : 'No project'}</option>`;
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (selectedId && p.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title-input').value.trim();
    if (!title) {
      document.getElementById('task-title-input').focus();
      return;
    }

    const date = document.getElementById('task-date-input').value || null;
    const time = document.getElementById('task-time-input').value || null;
    const projectId = document.getElementById('task-project-select').value || null;
    const duration = document.getElementById('task-duration-select').value;
    const notes = document.getElementById('task-notes-input').value.trim();
    const priority = document.querySelector('input[name="task-priority"]:checked')?.value || 'normal';
    const recurrenceType = document.getElementById('task-recurrence-select').value;

    const taskType = document.querySelector('input[name="task-type"]:checked')?.value || 'general';
    // Collect type-specific data
    const typeData = {};
    if (taskType === 'video') {
      typeData.videoLink = document.getElementById('task-video-link')?.value.trim() || '';
      const cDur = document.getElementById('task-video-duration')?.value.trim();
      const sDur = document.getElementById('task-video-duration-select')?.value;
      const rawD = cDur || sDur || '';
      typeData.videoDuration = rawD ? formatHM(rawD) : '';
      typeData.videoDurationSelect = sDur || '';
    } else if (taskType === 'homework') {
      // Auto-add any pending input in hw-range-input
      const hwInput = document.getElementById('hw-range-input');
      if (hwInput && hwInput.value.trim()) {
        if (!window._hwRanges) window._hwRanges = [];
        window._hwRanges.push(hwInput.value.trim());
        hwInput.value = '';
      }
      typeData.hwRanges = window._hwRanges ? Array.from(window._hwRanges) : [];
      typeData.hwPages = (typeData.hwRanges).join(', ');
      typeData.hwScore = document.getElementById('task-hw-score')?.value.trim() || '';
    } else if (taskType === 'exam') {
      typeData.examScore = document.getElementById('task-exam-score')?.value.trim() || '';
      typeData.examLocation = document.getElementById('task-exam-location')?.value || 'school';
    }

    if (editingTaskId) {
      Store.updateTask(editingTaskId, { title, plannedDate: date, time, projectId, estimatedMinutes: duration ? Number(duration) : null, notes, priority, taskType, ...typeData });
      UI.toast('Task updated.');
    } else {
      if (recurrenceType && recurrenceType !== '') {
        // Create recurrence
        const days = recurrenceType === 'custom'
          ? [...document.querySelectorAll('.day-chips input:checked')].map(i => i.value)
          : [];
        Store.addRecurrence({
          title, notes, priority, projectId,
          estimatedMinutes: duration ? Number(duration) : null,
          frequency: recurrenceType === 'custom' ? 'custom' : recurrenceType,
          daysOfWeek: days,
          startDate: date || Utils.todayStr(),
          time,
        });
        UI.toast('Recurring task created.');
      } else {
        Store.addTask({ title, plannedDate: date, time, projectId, estimatedMinutes: duration ? Number(duration) : null, notes, priority, taskType, ...typeData });
        UI.toast('Task added.');
      }
    }

    closeModal();
    App.refresh();
  }

  function initModal() {
    document.getElementById('task-form').addEventListener('submit', onFormSubmit);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

    // Click outside to close
    document.getElementById('task-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Task-type chips event delegation
    const chipsContainer = document.getElementById('task-type-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.task-type-chip');
        if (!chip) return;
        const radio = chip.querySelector('input[name="task-type"]');
        if (radio) {
          setTaskType(radio.value);
        }
      });
      chipsContainer.addEventListener('change', (e) => {
        if (e.target && e.target.name === 'task-type') {
          setTaskType(e.target.value);
        }
      });
    }

    // Recurrence select
    document.getElementById('task-recurrence-select').addEventListener('change', (e) => {
      document.getElementById('recurrence-days-wrap').style.display =
        e.target.value === 'custom' ? 'block' : 'none';
    });

    // Homework range: Enter key to add range tag
    const hwInput = document.getElementById('hw-range-input');
    if (hwInput) {
      hwInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (typeof window.hwAddRange === 'function') window.hwAddRange();
        }
      });
    }

    // Video: sync select <-> custom text field
    const vdSel = document.getElementById('task-video-duration-select');
    const vdTxt = document.getElementById('task-video-duration');
    if (vdSel && vdTxt) {
      vdSel.addEventListener('change', function() {
        if (vdSel.value) {
          vdTxt.value = formatHM(vdSel.value);
        }
      });
      vdTxt.addEventListener('input', function() {
        if (vdTxt.value.trim()) {
          vdSel.value = '';
        }
      });
    }
  }

  return {
    buildTaskRow,
    buildRecurrenceRow,
    openCreateModal,
    openEditModal,
    closeModal,
    handleDelete,
    initModal,
    getDragId,
    setTaskType,
  };
})();
