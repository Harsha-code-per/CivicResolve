import type { CivicIssue } from './types.js';

/**
 * Returns realistic initial civic complaints so deployed demos showcase full workflows immediately.
 *
 * @returns Array of seeded CivicIssue records.
 */
export function createSeedIssues(): CivicIssue[] {
  return [
    {
      id: 'CR-2026-1001',
      title: 'Deep pothole near PSG iTech main entrance causing two-wheeler skids',
      description:
        'A deep crater-like pothole spans the left lane right outside the campus bus bay. Two commuters nearly skidded during morning peak traffic.',
      location: 'Avinashi Road, Neelambur, Coimbatore',
      category: 'roads_potholes',
      priority: 'critical',
      urgencyScore: 88,
      department: 'Roads & Infrastructure Division',
      slaHours: 4,
      status: 'in_progress',
      aiSummary: 'Deep pothole on Avinashi Road causing immediate two-wheeler accident hazard.',
      aiRationale: 'Critical urgency due to active commuter safety risk on a high-volume arterial road.',
      triageSource: 'deterministic',
      createdAt: '2026-11-20T04:15:00.000Z',
      updatedAt: '2026-11-20T07:30:00.000Z',
      timeline: [
        {
          status: 'reported',
          timestamp: '2026-11-20T04:15:00.000Z',
          actor: 'citizen',
          note: 'Complaint submitted via CivicResolve citizen portal.',
        },
        {
          status: 'in_progress',
          timestamp: '2026-11-20T07:30:00.000Z',
          actor: 'admin',
          note: 'Road repair crew dispatched with hot-mix asphalt unit #4.',
        },
      ],
    },
    {
      id: 'CR-2026-1002',
      title: 'Overflowing community garbage bin beside Gandhipuram bus stand',
      description:
        'Municipal bin has been overflowing for three days, spilling waste onto the pedestrian walkway and creating strong foul odor.',
      location: 'Cross Cut Road, Gandhipuram, Coimbatore',
      category: 'waste_management',
      priority: 'high',
      urgencyScore: 68,
      department: 'Solid Waste Management Department',
      slaHours: 24,
      status: 'reported',
      aiSummary: 'Multi-day garbage overflow obstructing pedestrian footpath near Gandhipuram.',
      aiRationale: 'High priority due to public sanitation impact and dense commuter footfall.',
      triageSource: 'deterministic',
      createdAt: '2026-11-20T06:40:00.000Z',
      updatedAt: '2026-11-20T06:40:00.000Z',
      timeline: [
        {
          status: 'reported',
          timestamp: '2026-11-20T06:40:00.000Z',
          actor: 'citizen',
          note: 'Complaint logged and auto-triaged to Solid Waste Management.',
        },
      ],
    },
    {
      id: 'CR-2026-1003',
      title: 'Three streetlights out along RS Puram school zone',
      description:
        'Consecutive street lamp poles have been pitch dark since Monday evening, making the school crossing unsafe after 6 PM.',
      location: 'DB Road, RS Puram, Coimbatore',
      category: 'street_lighting',
      priority: 'high',
      urgencyScore: 76,
      department: 'Street Lighting & Electrical Wing',
      slaHours: 24,
      status: 'reported',
      aiSummary: 'Three consecutive non-functional streetlights darkening an active school crossing.',
      aiRationale: 'High priority because poor evening visibility near a school elevates safety risks.',
      triageSource: 'deterministic',
      createdAt: '2026-11-19T13:10:00.000Z',
      updatedAt: '2026-11-19T13:10:00.000Z',
      timeline: [
        {
          status: 'reported',
          timestamp: '2026-11-19T13:10:00.000Z',
          actor: 'citizen',
          note: 'Reported by neighborhood resident.',
        },
      ],
    },
    {
      id: 'CR-2026-1004',
      title: 'Burst drinking water pipeline flooding Peelamedu junction',
      description:
        'Clean water has been gushing out of a fractured municipal main since early morning, flooding the service lane and wasting water.',
      location: 'Peelamedu Main Junction, Coimbatore',
      category: 'water_drainage',
      priority: 'critical',
      urgencyScore: 92,
      department: 'Water Supply & Drainage Board',
      slaHours: 4,
      status: 'resolved',
      aiSummary: 'Fractured drinking water main causing roadway flooding at Peelamedu junction.',
      aiRationale: 'Critical infrastructure failure affecting potable water supply and road safety.',
      triageSource: 'deterministic',
      createdAt: '2026-11-18T02:50:00.000Z',
      updatedAt: '2026-11-18T08:20:00.000Z',
      timeline: [
        {
          status: 'reported',
          timestamp: '2026-11-18T02:50:00.000Z',
          actor: 'citizen',
          note: 'Emergency water leak reported.',
        },
        {
          status: 'in_progress',
          timestamp: '2026-11-18T03:45:00.000Z',
          actor: 'admin',
          note: 'Isolation valve shut off; pipe replacement team on site.',
        },
        {
          status: 'resolved',
          timestamp: '2026-11-18T08:20:00.000Z',
          actor: 'admin',
          note: 'Damaged 150mm section replaced and pressure-tested.',
        },
      ],
    },
  ];
}
