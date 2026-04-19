import { dataClient } from './dataClient';

export const projectService = {
  list: () => dataClient.get('projects'),

  async findLine(projectId, lineId) {
    const projects = await dataClient.get('projects');
    const p = projects.find((x) => x.id === projectId);
    if (!p) return null;
    return p.lines.find((l) => l.id === lineId) || null;
  },

  async allLines() {
    const projects = await dataClient.get('projects');
    const out = [];
    for (const p of projects) {
      for (const l of p.lines) {
        out.push({
          projectId: p.id,
          projectName: p.name,
          lineId: l.id,
          lineName: l.name,
          machineCount: l.machines.length,
        });
      }
    }
    return out;
  },

  async upsertProject(project) {
    return dataClient.patch('projects', (prev) => {
      const idx = prev.findIndex((p) => p.id === project.id);
      if (idx === -1) return [...prev, project];
      const next = prev.slice();
      next[idx] = project;
      return next;
    });
  },
};
