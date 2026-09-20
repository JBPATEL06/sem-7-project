export class ApiClient {
  private static getHeaders() {
    const token = localStorage.getItem('ai_manager_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  static async get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API GET failed');
    return data;
  }

  static async post<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API POST failed');
    return data;
  }

  static async put<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API PUT failed');
    return data;
  }

  static async delete<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API DELETE failed');
    return data;
  }

  // Legacy Prototype Compatibility
  static async getPlans(..._args: any[]): Promise<any> { return this.get('/api/plans'); }
  static async getProposals(..._args: any[]): Promise<any> { return this.get('/api/proposals'); }
  static async getQueries(..._args: any[]): Promise<any> { return this.get('/api/queries'); }
  static async getCallGraph(..._args: any[]): Promise<any> { return this.get('/api/call-graph'); }
  static async getDiscussions(..._args: any[]): Promise<any> { return this.get('/api/discussions'); }
  static async getDecisions(..._args: any[]): Promise<any> { return this.get('/api/decisions'); }
  static async getFunctionDetail(...args: any[]): Promise<any> { return this.get(`/api/functions/${encodeURIComponent(args[0] || '')}`); }
  static async approveProposal(...args: any[]): Promise<any> { return this.post(`/api/proposals/${args[0]}/approve`, {}); }
  static async rejectProposal(...args: any[]): Promise<any> { return this.post(`/api/proposals/${args[0]}/reject`, {}); }
}

export const getApiClient = () => ApiClient;
