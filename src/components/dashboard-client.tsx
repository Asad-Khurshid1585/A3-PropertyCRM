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
  });

  const [editingId, setEditingId] = useState("");
  const [editingFields, setEditingFields] = useState({
    status: "",
    notes: "",
    followUpDate: "",
    budget: "",
  });

  const [properties, setProperties] = useState<SafeProperty[]>([]);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

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

  const loadProperties = async () => {
    const params = new URLSearchParams();
    if (propertyFilter) params.set("status", propertyFilter);
    if (propertyTypeFilter) params.set("type", propertyTypeFilter);
    const qs = params.toString();
    const data = await fetchJSON<{ properties: SafeProperty[] }>(`/api/properties${qs ? `?${qs}` : ""}`);
    setProperties(data.properties);
  };

  const importProperties = async () => {
    if (!importFile) {
      setError("Please select a file first");
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
        setError(body.error || "Import failed");
        return;
      }
      alert(`Successfully imported ${body.data.count} properties`);
      setShowImportModal(false);
      setImportFile(null);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const assignProperty = async (propertyId: string, agentId: string) => {
    if (!agentId) return;
    await fetchJSON<{ message: string }>("/api/properties/assign", {
      method: "POST",
      body: JSON.stringify({ propertyId, agentId }),
    });
    await loadProperties();
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

  const exportLeads = (format: "csv" | "json") => {
    window.open(`/api/leads/export?format=${format}`, "_blank");
  };

  const loadActivities = async (leadId: string) => {
    if (!leadId) return;
    const data = await fetchJSON<{ activities: ActivityItem[] }>(
      `/api/leads/${leadId}/activities`,
    );
    setActivities(data.activities);
  };

  const pollEvents = async () => {
    const url = eventsSince ? `/api/events?since=${encodeURIComponent(eventsSince)}` : "/api/events";
    const data = await fetchJSON<{ events: { createdAt: string }[]; serverTime: string }>(
      url,
    );

    if (data.events.length > 0) {
      await Promise.all([loadLeads(), loadFollowups(), role === "admin" ? loadAnalytics() : Promise.resolve()]);
      if (selectedLeadId) {
        await loadActivities(selectedLeadId);
      }
    }

    setEventsSince(data.serverTime);
  };

  useEffect(() => {
    void Promise.all([loadLeads(), loadAgents(), loadAnalytics(), loadFollowups()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role]);

  useEffect(() => {
    void loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyFilter, propertyTypeFilter, role]);

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
            <p className="text-sm font-semibold">Agent Performance</p>
            <div className="mt-2 space-y-2 text-sm">
              {analytics.agentPerformance.length === 0 && <p>No assigned leads yet.</p>}
              {analytics.agentPerformance.map((item) => (
                <div key={item.agentId} className="rounded-lg bg-[var(--surface-2)] p-2">
                  <p className="font-semibold">{item.agentName}</p>
                  <p>{item.totalHandled} leads handled</p>
                </div>
              ))}
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
          <div className="mt-3 space-y-1 text-sm">
            {followupSummary.overdueFollowups.slice(0, 5).map((lead) => (
              <p key={lead.id}>{lead.name}</p>
            ))}
          </div>
        </div>
        <div className="crm-card p-4">
          <p className="text-sm font-semibold">Stale Leads (No Activity)</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">
            {followupSummary.staleLeads.length}
          </p>
          <div className="mt-3 space-y-1 text-sm">
            {followupSummary.staleLeads.slice(0, 5).map((lead) => (
              <p key={lead.id}>{lead.name}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="flex gap-2">
        <button className="crm-button" onClick={() => exportLeads("csv")}>
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
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.urgency === "immediate"
                        ? "bg-red-100 text-red-700"
                        : item.urgency === "this_week"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.urgency}
                  </span>
                  <span className="font-semibold">{item.leadName}</span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1">{item.reason}</p>
                <p className="text-sm mt-1">→ {item.suggestedAction}</p>
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
          <h2 className="text-lg font-bold">Create Lead</h2>
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
            <option value="closed">Closed</option>
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
                    <a className="text-[var(--brand)] underline" href={toWhatsappLink(lead.phone)} target="_blank" rel="noreferrer">
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
                          <option value="closed">Closed</option>
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">Properties</h2>
          {role === "admin" && (
            <button className="crm-button ml-auto" onClick={() => setShowImportModal(true)}>
              Import CSV
            </button>
          )}
        </div>

        {showImportModal && (
          <div className="mb-4 rounded-lg border border-[var(--brand)] p-4">
            <p className="mb-2 font-semibold">Import Properties from CSV</p>
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
                disabled={!importFile}
                onClick={importProperties}
              >
                Import
              </button>
              <button className="crm-button" onClick={() => { setShowImportModal(false); setImportFile(null); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <select className="crm-input" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
          </select>
          <select className="crm-input" value={propertyTypeFilter} onChange={(e) => setPropertyTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-2)]">
                <th className="p-2">Property</th>
                <th className="p-2">Type</th>
                <th className="p-2">Price</th>
                <th className="p-2">Area</th>
                <th className="p-2">Beds/Baths</th>
                <th className="p-2">Status</th>
                <th className="p-2">Assigned</th>
                {role === "admin" && <th className="p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td className="p-4 text-center" colSpan={role === "admin" ? 8 : 7}>
                    No properties yet. Import from CSV (admin).
                  </td>
                </tr>
              ) : (
                properties.map((prop) => (
                  <tr key={prop.id} className="border-b border-[var(--surface-2)]">
                    <td className="p-2">
                      <p className="font-semibold">{prop.title}</p>
                      <p className="text-xs text-[var(--muted)]">{prop.address}</p>
                    </td>
                    <td className="p-2 capitalize">{prop.type}</td>
                    <td className="p-2">PKR {prop.price.toLocaleString()}</td>
                    <td className="p-2">{prop.area} sqft</td>
                    <td className="p-2">{prop.bedrooms}/{prop.bathrooms}</td>
                    <td className="p-2">
                      <span className={`crm-chip ${
                        prop.status === "available" ? "bg-green-100 text-green-700" :
                        prop.status === "sold" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="p-2">{prop.assignedTo?.name || "Unassigned"}</td>
                    {role === "admin" && (
                      <td className="p-2">
                        <select className="crm-input" defaultValue="" onChange={(e) => void assignProperty(prop.id, e.target.value)}>
                          <option value="">Assign agent</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="crm-card p-4">
        <h2 className="text-lg font-bold">Lead Activity Timeline</h2>
        {selectedLeadId ? (
          <div className="mt-3 space-y-3">
            {activities.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--surface-2)] p-3">
                <p className="text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</p>
                <p className="font-semibold">{item.description}</p>
                <p className="text-xs text-[var(--muted)]">By: {item.actor?.name || "System"}</p>
              </div>
            ))}
            {activities.length === 0 && <p className="text-sm">No activity for this lead yet.</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm">Select a lead to view timeline.</p>
        )}
      </section>
    </div>
  );
}
