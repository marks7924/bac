/**
 * projects.js — Project views and project modal
 */

const Projects = (() => {

  // -- Project modal --------------------------------------

  let editingProjectId = null;
  let currentSubTab = 'active'; // 'active' | 'archive'
  let isDoneExpanded = false;

  function openCreateModal() {
    editingProjectId = null;
    document.getElementById('project-modal-title').textContent = 'New project';
    document.getElementById('project-form').reset();
    const modal = document.getElementById('project-modal');
    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('proj-name-input').focus();
  }

  function openEditModal(projectId) {
    const proj = Store.getProject(projectId);
    if (!proj) return;
    editingProjectId = projectId;
    document.getElementById('project-modal-title').textContent = 'Edit project';
    document.getElementById('proj-name-input').value = proj.name;
    document.getElementById('proj-desc-input').value = proj.description || '';
    document.getElementById('proj-start-input').value = proj.startDate || '';
    document.getElementById('proj-deadline-input').value = proj.deadline || '';
    const modal = document.getElementById('project-modal');
    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
    document.getElementById('proj-name-input').focus();
  }

  function closeModal() {
    const modal = document.getElementById('project-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingProjectId = null;
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('proj-name-input').value.trim();
    if (!name) return;
    const description = document.getElementById('proj-desc-input').value.trim();
    const startDate = document.getElementById('proj-start-input').value || null;
    const deadline = document.getElementById('proj-deadline-input').value || null;

    if (editingProjectId) {
      Store.updateProject(editingProjectId, { name, description, startDate, deadline });
      UI.toast('Project updated.');
    } else {
      Store.addProject({ name, description, startDate, deadline });
      UI.toast('Project created.');
    }
    closeModal();
    App.refresh();
  }

  function initModal() {
    document.getElementById('project-form')?.addEventListener('submit', onFormSubmit);
    document.getElementById('project-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('project-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('project-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Subtabs in main projects view
    document.getElementById('tab-projects-active')?.addEventListener('click', () => {
      switchProjectsSubTab('active');
    });
    document.getElementById('tab-projects-archive')?.addEventListener('click', () => {
      switchProjectsSubTab('archive');
    });
    document.getElementById('btn-unarchive-all-tasks')?.addEventListener('click', () => {
      const count = Store.unarchiveAllTasks();
      UI.toast(`${count} task(s) unarchived.`);
      renderProjectsList();
    });

    document.getElementById('back-to-projects')?.addEventListener('click', () => {
      try { localStorage.removeItem('sh_last_project_id'); } catch(e) {}
      App.navigate('projects');
    });
  }

  // -- Projects list view ---------------------------------

  function renderProjectsList() {
    const isAr = window.lang === 'ar';
    const projTitle = document.querySelector('#view-projects .page-title');
    if (projTitle) projTitle.textContent = isAr ? 'المشاريع' : 'Projects';
    const projSub = document.querySelector('#view-projects .page-sub');
    if (projSub) projSub.textContent = isAr ? 'تنظيم المهام حسب المشروع أو الهدف.' : 'Organize tasks by project or goal.';
    const createBtnSpan = document.querySelector('#create-project-btn span');
    if (createBtnSpan) createBtnSpan.textContent = isAr ? 'مشروع جديد' : 'New project';
    const emptyTitle = document.querySelector('#projects-empty .empty-title');
    if (emptyTitle) emptyTitle.textContent = isAr ? 'لا توجد مشاريع حتى الآن.' : 'No projects yet.';

    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('projects-empty');
    const projects = Store.getProjects();
    if (grid) grid.innerHTML = '';

    if (!projects.length) {
      if (empty) empty.style.display = 'block';
      if (grid) grid.style.display = 'none';
    } else {
      if (empty) empty.style.display = 'none';
      if (grid) {
        grid.style.display = 'flex';
        projects.forEach(proj => {
          const card = buildProjectCard(proj);
          grid.appendChild(card);
        });
      }
    }

    // Render Archive Tab & Counter Badge
    renderArchiveList();
    switchProjectsSubTab(currentSubTab);
  }

  function renderArchiveList() {
    const archiveList = document.getElementById('projects-archive-list');
    const archiveEmpty = document.getElementById('projects-archive-empty');
    const unarchiveAllBtn = document.getElementById('btn-unarchive-all-tasks');
    const badge = document.getElementById('projects-archive-count');

    const archivedTasks = Store.getArchivedTasks();
    if (badge) badge.textContent = archivedTasks.length;

    if (!archiveList) return;
    archiveList.innerHTML = '';

    if (!archivedTasks.length) {
      if (archiveEmpty) archiveEmpty.style.display = 'block';
      if (unarchiveAllBtn) unarchiveAllBtn.style.display = 'none';
      return;
    }

    if (archiveEmpty) archiveEmpty.style.display = 'none';
    if (unarchiveAllBtn) unarchiveAllBtn.style.display = 'inline-flex';

    archivedTasks.forEach(task => {
      const isDone = task.status === 'completed';
      const row = document.createElement('li');
      row.className = `task-row${isDone ? ' completed' : ''}`;
      row.dataset.id = task.id;

      // Check indicator
      const check = document.createElement('div');
      check.className = isDone ? 'task-check done' : 'task-check';
      check.style.cursor = 'default';
      check.setAttribute('aria-hidden', 'true');
      if (isDone) {
        check.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }

      // Body
      const body = document.createElement('div');
      body.className = 'task-body';

      const title = document.createElement('span');
      title.className = 'task-title';
      title.textContent = task.title;
      body.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'task-meta';

      const statusBadge = document.createElement('span');
      statusBadge.className = 'task-type-badge';
      if (isDone) {
        statusBadge.style.cssText = 'background:rgba(16,185,129,.14);color:#10b981;font-size:10px;border-radius:4px;padding:2px 6px;font-weight:700';
        statusBadge.textContent = '✅ Completed';
      } else {
        statusBadge.style.cssText = 'background:rgba(245,158,11,.14);color:#f59e0b;font-size:10px;border-radius:4px;padding:2px 6px;font-weight:700';
        statusBadge.textContent = '⏳ Undone';
      }
      meta.appendChild(statusBadge);

      if (task.projectId) {
        const proj = Store.getProject(task.projectId);
        if (proj) {
          const tag = document.createElement('span');
          tag.className = 'task-project-tag';
          tag.textContent = '📁 ' + proj.name;
          meta.appendChild(tag);
        }
      }

      if (isDone && task.completedAt) {
        const d = new Date(task.completedAt);
        const compDate = document.createElement('span');
        compDate.className = 'task-time';
        compDate.textContent = 'Completed ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        meta.appendChild(compDate);
      } else if (task.plannedDate) {
        const planDate = document.createElement('span');
        planDate.className = 'task-time';
        planDate.textContent = 'Due ' + Utils.formatDisplayDate(task.plannedDate);
        meta.appendChild(planDate);
      }

      body.appendChild(meta);

      // Actions: Unarchive button
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      actions.style.opacity = '1';

      const unarchiveBtn = document.createElement('button');
      unarchiveBtn.className = 'btn-unarchive-task';
      unarchiveBtn.innerHTML = `↩️ Unarchive`;
      unarchiveBtn.title = 'Unarchive and restore to project';
      unarchiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.unarchiveTask(task.id);
        UI.toast('Task unarchived.');
        renderProjectsList();
      });

      actions.appendChild(unarchiveBtn);

      row.appendChild(check);
      row.appendChild(body);
      row.appendChild(actions);
      archiveList.appendChild(row);
    });
  }

  function switchProjectsSubTab(tab) {
    currentSubTab = tab;
    const activeBtn = document.getElementById('tab-projects-active');
    const archiveBtn = document.getElementById('tab-projects-archive');
    const activeCont = document.getElementById('projects-active-container');
    const archiveCont = document.getElementById('projects-archive-container');

    if (activeBtn) activeBtn.classList.toggle('active', tab === 'active');
    if (archiveBtn) archiveBtn.classList.toggle('active', tab === 'archive');

    if (activeCont) activeCont.style.display = (tab === 'active') ? 'block' : 'none';
    if (archiveCont) archiveCont.style.display = (tab === 'archive') ? 'block' : 'none';
  }

  function buildProjectCard(proj) {
    const { total, completed, pct } = Store.getProjectProgress(proj.id);
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = proj.id;

    const isAr = window.lang === 'ar';
    const daysLeft = proj.deadline ? Utils.daysUntil(proj.deadline) : null;
    let deadlineHtml = '';
    if (proj.deadline) {
      let cls = 'ok';
      let label = '';
      if (daysLeft < 0) { cls = ''; label = isAr ? `متأخر بـ ${Math.abs(daysLeft)} يوم` : `Overdue by ${Math.abs(daysLeft)}d`; }
      else if (daysLeft === 0) { cls = 'soon'; label = isAr ? 'ينتهي اليوم' : 'Due today'; }
      else if (daysLeft <= 3) { cls = 'soon'; label = isAr ? `${daysLeft} يوم متبقي` : `${daysLeft}d left`; }
      else { cls = 'ok'; label = isAr ? `${daysLeft} يوم متبقي` : `${daysLeft}d left`; }
      deadlineHtml = `<span class="deadline-badge ${cls}">${label}</span>`;
    }

    let dateRange = '';
    if (proj.startDate && proj.deadline) {
      dateRange = `${Utils.formatShortDate(proj.startDate)} — ${Utils.formatShortDate(proj.deadline)}`;
    } else if (proj.deadline) {
      dateRange = (isAr ? 'ينتهي في ' : 'Due ') + Utils.formatShortDate(proj.deadline);
    }

    card.innerHTML = `
      <div class="project-card-header">
        <div>
          <div class="project-card-title">${Utils.sanitizeHTML(proj.name)}</div>
          ${proj.description ? `<div class="project-card-desc">${Utils.sanitizeHTML(proj.description)}</div>` : ''}
        </div>
        <div class="project-card-actions">
          <button class="task-action-btn proj-edit-btn" data-id="${proj.id}" aria-label="Edit project" title="Edit">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 2L11 3.5 4 10.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
          </button>
          <button class="task-action-btn danger proj-delete-btn" data-id="${proj.id}" aria-label="Delete project" title="Delete">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2.5h4v1M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="project-card-meta">
        ${dateRange ? `<span class="project-card-dates">${dateRange}</span>` : ''}
        <span>${total} ${isAr ? 'مهام' : (total !== 1 ? 'tasks' : 'task')}</span>
        ${deadlineHtml}
      </div>
      <div class="project-card-progress">
        <div class="project-card-bar">
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <span class="project-card-pct">${pct}%</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.proj-edit-btn')) {
        e.stopPropagation();
        openEditModal(proj.id);
        return;
      }
      if (e.target.closest('.proj-delete-btn')) {
        e.stopPropagation();
        if (confirm(`Delete project "${proj.name}"? Tasks will remain but be unlinked.`)) {
          Store.deleteProject(proj.id);
          App.refresh();
          UI.toast('Project deleted.');
        }
        return;
      }
      openProjectDetail(proj.id);
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openProjectDetail(proj.id);
    });

    return card;
  }

  // -- Project detail view --------------------------------

  let currentProjectId = null;

  function openProjectDetail(projectId) {
    currentProjectId = projectId;
    try {
      localStorage.setItem('sh_last_project_id', projectId);
      localStorage.setItem('sh_last_todo_view', 'project-detail');
      localStorage.setItem('sh_last_page', 'todo');
    } catch(e) {}
    App.navigate('project-detail');
    renderProjectDetail(projectId);
  }

  function renderProjectDetail(projectId) {
    const proj = Store.getProject(projectId);
    if (!proj) return;

    const { total, completed, pct } = Store.getProjectProgress(projectId);
    // Non-archived tasks of this project
    const tasks = Store.getTasksForProject(projectId, false);
    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const doneTasks = tasks.filter(t => t.status === 'completed');

    // Header
    const header = document.getElementById('project-detail-header');
    const daysLeft = proj.deadline ? Utils.daysUntil(proj.deadline) : null;
    let deadlineStr = '';
    if (proj.deadline) {
      if (daysLeft < 0) deadlineStr = `Overdue by ${Math.abs(daysLeft)} days`;
      else if (daysLeft === 0) deadlineStr = 'Due today';
      else deadlineStr = `${daysLeft} days remaining`;
    }

    let dateRange = '';
    if (proj.startDate && proj.deadline) {
      dateRange = `${Utils.formatShortDate(proj.startDate)} — ${Utils.formatShortDate(proj.deadline)}`;
    } else if (proj.deadline) {
      dateRange = `Due ${Utils.formatShortDate(proj.deadline)}`;
    }

    header.innerHTML = `
      <div class="project-detail-name">${Utils.sanitizeHTML(proj.name)}</div>
      ${proj.description ? `<div class="project-card-desc" style="margin-bottom:12px">${Utils.sanitizeHTML(proj.description)}</div>` : ''}
      <div class="project-detail-meta">
        ${dateRange}${deadlineStr ? ` · ${deadlineStr}` : ''}
      </div>
      <div class="project-detail-stats">
        <div>
          <div class="project-stat-val">${pct}%</div>
          <div class="project-stat-label">complete</div>
        </div>
        <div>
          <div class="project-stat-val">${completed}/${total}</div>
          <div class="project-stat-label">tasks done</div>
        </div>
        ${daysLeft !== null && daysLeft >= 0 ? `
        <div>
          <div class="project-stat-val">${daysLeft}</div>
          <div class="project-stat-label">days left</div>
        </div>` : ''}
      </div>
      <div class="project-detail-bar">
        <div class="progress-bar-wrap" style="height:3px">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;

    // Body — group active tasks by date
    const body = document.getElementById('project-detail-body');
    body.innerHTML = '';

    const dated = activeTasks.filter(t => t.plannedDate).sort((a,b) => a.plannedDate.localeCompare(b.plannedDate));
    const undated = activeTasks.filter(t => !t.plannedDate);

    // Group active dated tasks
    const dateGroups = {};
    dated.forEach(t => {
      if (!dateGroups[t.plannedDate]) dateGroups[t.plannedDate] = [];
      dateGroups[t.plannedDate].push(t);
    });

    Object.entries(dateGroups).forEach(([date, dateTasks]) => {
      const group = document.createElement('div');
      group.className = 'project-date-group';

      group.addEventListener('dragover', (e) => {
        e.preventDefault();
        group.classList.add('group-drag-over');
      });
      group.addEventListener('dragleave', (e) => {
        if (!group.contains(e.relatedTarget)) {
          group.classList.remove('group-drag-over');
        }
      });
      group.addEventListener('drop', (e) => {
        group.classList.remove('group-drag-over');
        if (e.target.closest('.task-row')) return;
        e.preventDefault();
        const dragId = Tasks.getDragId();
        if (dragId) {
          Store.updateTask(dragId, { plannedDate: date, projectId });
          App.refresh();
          UI.toast(`Task scheduled for ${Utils.formatShortDate(date)}.`);
        }
      });

      const heading = document.createElement('div');
      heading.className = 'project-date-heading';
      heading.textContent = Utils.formatLongDate(date).toUpperCase();
      group.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'task-list';
      dateTasks.forEach(task => {
        list.appendChild(Tasks.buildTaskRow(task, { showProject: false, showArchiveBtn: true }));
      });
      group.appendChild(list);
      body.appendChild(group);
    });

    if (undated.length || Object.keys(dateGroups).length > 0) {
      const unscheduledWrap = document.createElement('div');
      unscheduledWrap.className = 'project-unscheduled-wrap';

      unscheduledWrap.addEventListener('dragover', (e) => {
        e.preventDefault();
        unscheduledWrap.classList.add('group-drag-over');
      });
      unscheduledWrap.addEventListener('dragleave', (e) => {
        if (!unscheduledWrap.contains(e.relatedTarget)) {
          unscheduledWrap.classList.remove('group-drag-over');
        }
      });
      unscheduledWrap.addEventListener('drop', (e) => {
        unscheduledWrap.classList.remove('group-drag-over');
        if (e.target.closest('.task-row')) return;
        e.preventDefault();
        const dragId = Tasks.getDragId();
        if (dragId) {
          Store.updateTask(dragId, { plannedDate: null, projectId });
          App.refresh();
          UI.toast('Task moved to unscheduled.');
        }
      });

      const label = document.createElement('div');
      label.className = 'project-unscheduled-heading';
      label.textContent = 'Unscheduled';
      unscheduledWrap.appendChild(label);
      const list = document.createElement('ul');
      list.className = 'task-list';
      undated.forEach(task => {
        list.appendChild(Tasks.buildTaskRow(task, { showProject: false, showDate: false, showArchiveBtn: true }));
      });
      unscheduledWrap.appendChild(list);
      body.appendChild(unscheduledWrap);
    }

    // ── COLLAPSIBLE DONE TASKS SECTION ──
    if (doneTasks.length > 0) {
      const doneSection = document.createElement('div');
      doneSection.className = 'project-done-section';
      doneSection.id = 'project-done-section';

      const doneHeader = document.createElement('div');
      doneHeader.className = 'project-done-header';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'project-done-toggle';
      toggleBtn.setAttribute('aria-expanded', isDoneExpanded ? 'true' : 'false');
      toggleBtn.innerHTML = `
        <svg class="project-done-chevron${isDoneExpanded ? ' open' : ''}" width="12" height="12" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Completed</span>
        <span class="project-done-count">(${doneTasks.length})</span>
      `;

      const archiveDoneBtn = document.createElement('button');
      archiveDoneBtn.type = 'button';
      archiveDoneBtn.className = 'btn-archive-project-done admin-only';
      archiveDoneBtn.innerHTML = `📦 Archive Done (${doneTasks.length})`;
      archiveDoneBtn.title = 'Archive all done tasks in this project';
      archiveDoneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const count = Store.archiveDoneTasks(projectId);
        UI.toast(`${count} done task(s) archived.`);
        renderProjectDetail(projectId);
      });

      doneHeader.appendChild(toggleBtn);
      doneHeader.appendChild(archiveDoneBtn);

      const doneList = document.createElement('ul');
      doneList.className = 'task-list project-done-list';
      doneList.style.display = isDoneExpanded ? 'block' : 'none';

      doneTasks.forEach(task => {
        doneList.appendChild(Tasks.buildTaskRow(task, { showProject: false, showArchiveBtn: true }));
      });

      doneHeader.addEventListener('click', (e) => {
        if (e.target.closest('.btn-archive-project-done')) return;
        isDoneExpanded = !isDoneExpanded;
        doneList.style.display = isDoneExpanded ? 'block' : 'none';
        toggleBtn.setAttribute('aria-expanded', isDoneExpanded ? 'true' : 'false');
        const chevron = doneHeader.querySelector('.project-done-chevron');
        if (chevron) chevron.classList.toggle('open', isDoneExpanded);
      });

      doneSection.appendChild(doneHeader);
      doneSection.appendChild(doneList);
      body.appendChild(doneSection);
    }

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-title">No tasks yet.</p><p class="empty-sub">Add tasks to start tracking progress.</p>`;
      body.appendChild(empty);
    }

    // Add task button
    const addBtn = document.getElementById('add-task-project');
    if (addBtn) {
      addBtn.onclick = () => {
        Tasks.openCreateModal({ projectId });
      };
    }
  }

  function getCurrentProjectId() { return currentProjectId; }

  return {
    openCreateModal,
    openEditModal,
    closeModal,
    initModal,
    renderProjectsList,
    openProjectDetail,
    renderProjectDetail,
    getCurrentProjectId,
  };
})();
