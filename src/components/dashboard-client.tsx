"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PriorityChip } from "@/components/priority-chip";
import { StatusChip } from "@/components/status-chip";
import { toWhatsappLink } from "@/lib/normalizers";
import type { SafeLead, SafeProperty } from "@/types";
import type { ActivityItem, AgentUser, ApiResponse } from "@/lib/client-types";

type DashboardClientProps = {
  role: "admin" | "agent";
};

type AnalyticsData = {
  totalLeads: number;
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  agentPerformance: {
    agentId: string;
    totalHandled: number;
    statuses: { status: string; count: number }[];
    agentName: string;
    agentEmail: string;
  }[];
};

const fetchJSON = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || "Request failed");
  }

  return body.data;
};

export function DashboardClient({ role }: DashboardClientProps) {
  const [leads, setLeads] = useState<SafeLead[]>([]);
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [eventsSince, setEventsSince] = useState<string | null>(null);
  const [followupSummary, setFollowupSummary] = useState<{
    overdueFollowups: SafeLead[];
    staleLeads: SafeLead[];
  }>({ overdueFollowups: [], staleLeads: [] });
  const [aiSuggestions, setAiSuggestions] = useState<{
    leadId: string;
    leadName: string;
    priority: string;
    reason: string;
    suggestedAction: string;
    urgency: string;
  }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    propertyInterest: "",
    budget: "",
    source: "facebook_ads",
    notes: "",
    assignedTo: "",
    lastActivityAt: "",
  });

  const [editingId, setEditingId] = useState("");
  const [editingFields, setEditingFields] = useState({
    status: "",
    notes: "",
    followUpDate: "",
    budget: "",
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [statusFilter, priorityFilter, searchQuery, dateFrom, dateTo]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        lead.propertyInterest.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const loadLeads = async () => {
    try {
      setError("");
      const data = await fetchJSON<{ leads: SafeLead[] }>(`/api/leads${query}`);
      setLeads(data.leads);
      if (!selectedLeadId && data.leads[0]) {
        setSelectedLeadId(data.leads[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    }
  };

  const loadAgents = async () => {
    if (role !== "admin") return;
    const data = await fetchJSON<{ agents: AgentUser[] }>("/api/users/agents");
    setAgents(data.agents);
  };

  const loadUser = async () => {
    const data = await fetchJSON<{ user: { name: string } }>("/api/auth/me");
    setCurrentUser(data.user);
  };

  const loadAnalytics = async () => {
    if (role !== "admin") return;
    const data = await fetchJSON<AnalyticsData>("/api/analytics");
    setAnalytics(data);
  };

  const loadFollowups = async () => {
    const data = await fetchJSON<{
      overdueFollowups: SafeLead[];
      staleLeads: SafeLead[];
    }>("/api/followups");
    setFollowupSummary(data);
  };

  const importLeads = async () => {
    if (!importFile) {
      alert("Please select a file first");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await fetch("/api/properties", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!body.success) {
        alert(body.error || "Import failed");
        return;
      }
      alert(`Successfully imported ${body.data.count} leads`);
      setShowImportModal(false);
      setImportFile(null);
      await loadLeads();
    } catch (err) {
      alert("Import failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const loadAiSuggestions = async () => {
    setShowSuggestions(true);
    const data = await fetchJSON<{
      suggestions: {
        leadId: string;
        leadName: string;
        priority: string;
        reason: string;
        suggestedAction: string;
        urgency: string;
      }[];
    }>("/api/ai/suggestions");
    setAiSuggestions(data.suggestions || []);
  };

  const exportLeads = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/leads/export?${params}`, { credentials: "include" });
      if (!response.ok) {
        const body = await response.json();
        alert(body.error || "Export failed");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const loadActivities = async (leadId: string) => {
    if (!leadId) return;
    const data = await fetchJSON<{ activities: ActivityItem[] }>(
      `/api/leads/${leadId}/activities`,
    );
    setActivities(data.activities);
  };

  const loadAllActivities = async () => {
    const data = await fetchJSON<{ activities: ActivityItem[] }>("/api/activities");
    setActivities(data.activities);
  };

  const pollEvents = async () => {
    const url = eventsSince ? `/api/events?since=${encodeURIComponent(eventsSince)}` : "/api/events";
    const data = await fetchJSON<{ events: { createdAt: string }[]; serverTime: string }>(
      url,
    );

    if (data.events.length > 0) {
      await Promise.all([loadLeads(), loadFollowups(), loadAllActivities(), role === "admin" ? loadAnalytics() : Promise.resolve()]);
      if (selectedLeadId) {
        await loadActivities(selectedLeadId);
      }
    }

    setEventsSince(data.serverTime);
  };

  useEffect(() => {
    void Promise.all([loadLeads(), loadAgents(), loadAnalytics(), loadFollowups(), loadAllActivities(), loadUser()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role]);

  useEffect(() => {
    if (selectedLeadId) {
      const timer = setTimeout(() => {
        void loadActivities(selectedLeadId);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [selectedLeadId]);

  useEffect(() => {
    const id = setInterval(() => {
      void pollEvents();
    }, 3000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsSince, selectedLeadId]);

  const createLead = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await fetchJSON<{ lead: SafeLead }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          ...newLead,
          budget: Number(newLead.budget),
          assignedTo: newLead.assignedTo || undefined,
          lastActivityAt: newLead.lastActivityAt ? new Date(newLead.lastActivityAt).toISOString() : undefined,
        }),
      });

      setNewLead({
        name: "",
        email: "",
        phone: "",
        propertyInterest: "",
        budget: "",
        source: "facebook_ads",
        notes: "",
        assignedTo: "",
        lastActivityAt: "",
      });

      await Promise.all([loadLeads(), loadAnalytics(), loadFollowups()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
    }
  };

  const startEdit = (lead: SafeLead) => {
    setEditingId(lead.id);
    setEditingFields({
      status: lead.status,
      notes: lead.notes,
      followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : "",
      budget: String(lead.budget),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      await fetchJSON<{ lead: SafeLead }>(`/api/leads/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editingFields.status,
          notes: editingFields.notes,
          budget: Number(editingFields.budget),
          followUpDate: editingFields.followUpDate
            ? new Date(editingFields.followUpDate).toISOString()
            : null,
        }),
      });

      setEditingId("");
      await Promise.all([loadLeads(), loadFollowups(), role === "admin" ? loadAnalytics() : Promise.resolve()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead");
    }
  };

  const deleteLead = async (leadId: string) => {
    await fetchJSON<{ message: string }>(`/api/leads/${leadId}`, { method: "DELETE" });
    await Promise.all([loadLeads(), loadAnalytics(), loadFollowups()]);
  };

  const assignLead = async (leadId: string, agentId: string) => {
    if (!agentId) return;

    await fetchJSON<{ message: string }>("/api/leads/assign", {
      method: "POST",
      body: JSON.stringify({ leadId, agentId }),
    });

    await Promise.all([loadLeads(), loadAnalytics()]);
  };

  return (
    <div className="space-y-6">
      {role === "admin" && analytics && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="crm-card p-4">
            <p className="text-sm text-[var(--muted)]">Total Leads</p>
            <p className="text-3xl font-bold">{analytics.totalLeads}</p>
          </div>
          <div className="crm-card p-4 md:col-span-3">
            <p className="text-sm font-semibold">Status Distribution</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {analytics.statusDistribution.map((item) => (
                <span key={item.status} className="crm-chip bg-[var(--surface-2)] text-[var(--foreground)]">
                  {item.status}: {item.count}
                </span>
              ))}
            </div>
          </div>
          <div className="crm-card p-4 md:col-span-2">
            <p className="text-sm font-semibold">Priority Distribution</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {analytics.priorityDistribution.map((item) => (
                <span key={item.priority} className="crm-chip bg-[var(--surface-2)] text-[var(--foreground)]">
                  {item.priority}: {item.count}
                </span>
              ))}
            </div>
          </div>
          <div className="crm-card p-4 md:col-span-2">
            <p className="text-sm font-semibold">Agent Performance (Ranked by Wins)</p>
            <div className="mt-3 space-y-3">
              {(() => {
                const sorted = [...analytics.agentPerformance]
                  .map(agent => {
                    const won = agent.statuses.find(s => s.status === "closed_won")?.count || 0;
                    const lost = agent.statuses.find(s => s.status === "closed_lost")?.count || 0;
                    return { ...agent, won, lost };
                  })
                  .sort((a, b) => b.won - a.won);

                if (sorted.length === 0) return <p className="text-sm">No assigned leads yet.</p>;

                const maxTotal = Math.max(...sorted.map(s => s.totalHandled), 1);

                return sorted.map((agent, idx) => (
                  <div key={agent.agentId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded ${
                          idx === 0 ? "bg-amber-500 text-black" : 
                          idx === 1 ? "bg-gray-400 text-black" : 
                          idx === 2 ? "bg-orange-700 text-white" : 
                          "bg-[var(--surface-2)] text-[var(--muted)]"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">{agent.agentName}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        <span className="text-green-400">{agent.won} won</span> · <span className="text-red-400">{agent.lost} lost</span> · {agent.totalHandled} total
                      </div>
                    </div>
                    <div className="h-4 flex rounded overflow-hidden bg-[var(--surface-2)]">
                      <div 
                        className="bg-green-500 transition-all" 
                        style={{ width: `${(agent.won / maxTotal) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all" 
                        style={{ width: `${(agent.lost / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="crm-card p-4">
          <p className="text-sm font-semibold">Overdue Follow-ups</p>
          <p className="mt-1 text-3xl font-bold text-[var(--danger)]">
            {followupSummary.overdueFollowups.length}
          </p>
          <p className="text-xs text-[var(--muted)] mb-2">Today: {new Date().toLocaleDateString()}</p>
          <div className="mt-2 space-y-2 text-sm max-h-48 overflow-y-auto">
            {followupSummary.overdueFollowups.slice(0, 10).map((lead) => {
              const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
              const daysOverdue = followUpDate ? Math.floor((Date.now() - followUpDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <div key={lead.id} className="flex justify-between items-center border-b border-[var(--surface-2)] pb-1">
                  <div>
                    <span className="font-medium">{lead.name}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">#{lead.id.slice(-4)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--danger)] font-semibold">{daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue</div>
                    <div className="text-xs text-[var(--muted)]">Was: {followUpDate?.toLocaleDateString() || "N/A"}</div>
                  </div>
                </div>
              );
            })}
            {followupSummary.overdueFollowups.length === 0 && <p className="text-sm text-[var(--muted)]">No overdue follow-ups</p>}
          </div>
        </div>
        <div className="crm-card p-4">
          <p className="text-sm font-semibold">Stale Leads (No Activity)</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">
            {followupSummary.staleLeads.length}
          </p>
          <p className="text-xs text-[var(--muted)] mb-2">Today: {new Date().toLocaleDateString()}</p>
          <div className="mt-2 space-y-2 text-sm max-h-48 overflow-y-auto">
            {followupSummary.staleLeads.slice(0, 10).map((lead) => {
              const daysSince = Math.floor((Date.now() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={lead.id} className="flex justify-between items-center border-b border-[var(--surface-2)] pb-1">
                  <div>
                    <span className="font-medium">{lead.name}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">#{lead.id.slice(-4)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-600 font-semibold">{daysSince} day{daysSince !== 1 ? "s" : ""} inactive</div>
                    <div className="text-xs text-[var(--muted)]">Last: {new Date(lead.lastActivityAt).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
            {followupSummary.staleLeads.length === 0 && <p className="text-sm text-[var(--muted)]">No stale leads</p>}
          </div>
        </div>
      </section>

      <section className="flex gap-2">
        <button className="crm-button" onClick={() => void exportLeads("csv")}>
          Export CSV
        </button>
        <button className="crm-button" onClick={() => loadAiSuggestions()}>
          AI Suggestions
        </button>
      </section>

      {showSuggestions && (
        <section className="crm-card p-4">
          <h2 className="text-lg font-bold">AI Follow-up Suggestions</h2>
          <div className="mt-3 space-y-2">
            {aiSuggestions.map((item) => (
              <div
                key={item.leadId}
                className="rounded-lg border border-[var(--surface-2)] p-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      item.urgency === "immediate"
                        ? "bg-red-600 text-white"
                        : item.urgency === "this_week"
                        ? "bg-amber-500 text-black"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {item.urgency.replace("_", " ")}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.priority === "high"
                        ? "bg-purple-600 text-white"
                        : item.priority === "medium"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span className="font-semibold">{item.leadName}</span>
                </div>
                <p className="text-sm text-[var(--foreground)] mt-2 font-medium">{item.reason}</p>
                <p className="text-sm text-[var(--brand)] mt-1 font-semibold">→ {item.suggestedAction}</p>
              </div>
            ))}
            {aiSuggestions.length === 0 && (
              <p className="text-sm">No suggestions at this time.</p>
            )}
          </div>
          <button
            className="mt-2 text-sm text-[var(--brand)] underline"
            onClick={() => setShowSuggestions(false)}
          >
            Close
          </button>
        </section>
      )}

      {role === "admin" && (
        <section className="crm-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Create Lead</h2>
            <button className="crm-button ml-auto" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
          </div>

          {showImportModal && (
            <div className="mb-4 rounded-lg border border-[var(--brand)] p-4">
              <p className="mb-2 font-semibold">Import Leads from CSV</p>
              <label className="block mb-2">
                <span className="text-sm text-[var(--muted)]">Select CSV file:</span>
                <input
                  type="file"
                  accept=".csv"
                  className="block w-full mt-1 p-2 border border-[var(--surface-2)] rounded"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </label>
              {importFile && <p className="text-sm mb-2">Selected: {importFile.name}</p>}
              <div className="flex gap-2">
                <button 
                  className="crm-button" 
                  onClick={() => importLeads()}
                >
                  Import
                </button>
                <button className="crm-button" onClick={() => { setShowImportModal(false); setImportFile(null); }}>Cancel</button>
              </div>
            </div>
          )}

          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createLead}>
            <input className="crm-input" placeholder="Name" required value={newLead.name} onChange={(event) => setNewLead((prev) => ({ ...prev, name: event.target.value }))} />
            <input className="crm-input" type="email" placeholder="Email" required value={newLead.email} onChange={(event) => setNewLead((prev) => ({ ...prev, email: event.target.value }))} />
            <input className="crm-input" placeholder="Phone (923...)" required value={newLead.phone} onChange={(event) => setNewLead((prev) => ({ ...prev, phone: event.target.value }))} />
            <input className="crm-input" placeholder="Property interest" required value={newLead.propertyInterest} onChange={(event) => setNewLead((prev) => ({ ...prev, propertyInterest: event.target.value }))} />
            <input className="crm-input" type="number" placeholder="Budget" required value={newLead.budget} onChange={(event) => setNewLead((prev) => ({ ...prev, budget: event.target.value }))} />
            <select className="crm-input" value={newLead.source} onChange={(event) => setNewLead((prev) => ({ ...prev, source: event.target.value }))}>
              <option value="facebook_ads">Facebook Ads</option>
              <option value="walk_in">Walk-in Client</option>
              <option value="website_inquiry">Website Inquiry</option>
            </select>
            <textarea className="crm-input md:col-span-2" placeholder="Notes" value={newLead.notes} onChange={(event) => setNewLead((prev) => ({ ...prev, notes: event.target.value }))} />
            <select className="crm-input" value={newLead.assignedTo} onChange={(event) => setNewLead((prev) => ({ ...prev, assignedTo: event.target.value }))}>
              <option value="">Assign Later</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <input
              className="crm-input"
              type="date"
              title="Last activity date (leave empty for now)"
              value={newLead.lastActivityAt}
              onChange={(event) => setNewLead((prev) => ({ ...prev, lastActivityAt: event.target.value }))}
            />
            <button className="crm-button" type="submit">Add Lead</button>
          </form>
        </section>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <section className="crm-card p-4">
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <input
            className="crm-input flex-1 min-w-[200px]"
            type="text"
            placeholder="Search name, email, phone, property..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <select className="crm-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="contacted">Contacted</option>
            <option value="in_progress">In Progress</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
          <select className="crm-input" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input className="crm-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className="crm-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-2)]">
                <th className="p-2">Lead</th>
                <th className="p-2">Priority</th>
                <th className="p-2">Status</th>
                <th className="p-2">Budget</th>
                <th className="p-2">Assigned</th>
                <th className="p-2">WhatsApp</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td className="p-4 text-center" colSpan={7}>
                    {leads.length === 0
                      ? "No leads yet."
                      : "No leads match your search."}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--surface-2)] align-top">
                  <td className="p-2">
                    <button type="button" className="font-semibold underline" onClick={() => setSelectedLeadId(lead.id)}>
                      {lead.name}
                    </button>
                    <p className="text-xs text-[var(--muted)]">{lead.email}</p>
                  </td>
                  <td className="p-2"><PriorityChip priority={lead.score} /></td>
                  <td className="p-2"><StatusChip status={lead.status} /></td>
                  <td className="p-2">PKR {lead.budget.toLocaleString()}</td>
                  <td className="p-2">{lead.assignedTo?.name || "Unassigned"}</td>
                  <td className="p-2">
                    <a
                      className="text-[var(--brand)] underline"
                      href={toWhatsappLink(lead.phone, `Hi ${lead.name.split(" ")[0]}, this is ${currentUser?.name || "your agent"} from the property team. I wanted to follow up on your inquiry about ${lead.propertyInterest}. How can I help you?`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Chat
                    </a>
                  </td>
                  <td className="space-y-2 p-2">
                    {editingId === lead.id ? (
                      <div className="space-y-2">
                        <select className="crm-input" value={editingFields.status} onChange={(event) => setEditingFields((prev) => ({ ...prev, status: event.target.value }))}>
                          <option value="new">New</option>
                          <option value="assigned">Assigned</option>
                          <option value="contacted">Contacted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="closed_lost">Closed Lost</option>
                        </select>
                        <input className="crm-input" type="number" value={editingFields.budget} onChange={(event) => setEditingFields((prev) => ({ ...prev, budget: event.target.value }))} />
                        <input className="crm-input" type="date" value={editingFields.followUpDate} onChange={(event) => setEditingFields((prev) => ({ ...prev, followUpDate: event.target.value }))} />
                        <textarea className="crm-input" value={editingFields.notes} onChange={(event) => setEditingFields((prev) => ({ ...prev, notes: event.target.value }))} />
                        <button type="button" className="crm-button" onClick={saveEdit}>Save</button>
                      </div>
                    ) : (
                      <button type="button" className="rounded-md border border-[var(--brand)] px-3 py-1 text-[var(--brand)]" onClick={() => startEdit(lead)}>
                        Edit
                      </button>
                    )}

                    {role === "admin" && (
                      <>
                        <select className="crm-input" defaultValue="" onChange={(event) => void assignLead(lead.id, event.target.value)}>
                          <option value="">Assign agent</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                        <button type="button" className="rounded-md border border-[var(--danger)] px-3 py-1 text-[var(--danger)]" onClick={() => void deleteLead(lead.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="crm-card p-4">
        <h2 className="text-lg font-bold">Activity Log</h2>
        <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
          {activities.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--surface-2)] p-3">
              <p className="text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              <p className="font-semibold">{item.description}</p>
              <p className="text-xs text-[var(--muted)]">By: {item.actor?.name || "System"}</p>
            </div>
          ))}
          {activities.length === 0 && <p className="text-sm">No activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
