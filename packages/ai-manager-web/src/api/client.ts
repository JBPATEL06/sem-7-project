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
}
