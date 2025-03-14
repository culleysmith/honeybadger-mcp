import fetch, { Headers, RequestInit } from 'node-fetch';

export interface HoneybadgerApiOptions {
  apiToken: string;
  baseUrl?: string;
}

export interface Project {
  id: number;
  name: string;
  fault_count: number;
  unresolved_fault_count: number;
  environments: string[];
  token: string;
  active: boolean;
  [key: string]: any;
}

export interface Fault {
  id: number;
  project_id: number;
  klass: string;
  message: string;
  environment: string;
  resolved: boolean;
  ignored: boolean;
  notices_count: number;
  created_at: string;
  last_notice_at: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  [key: string]: any;
}

export interface Notice {
  id: string;
  fault_id: number;
  message: string;
  created_at: string;
  request?: {
    url?: string;
    component?: string;
    action?: string;
    params?: Record<string, any>;
    session?: Record<string, any>;
    context?: Record<string, any>;
    [key: string]: any;
  };
  backtrace?: Array<{
    file: string;
    number: string;
    method: string;
  }>;
  [key: string]: any;
}

export class HoneybadgerApi {
  private apiToken: string;
  private baseUrl: string;
  private projectsCache: Map<string, Project> = new Map(); // Cache projects by name and ID

  constructor(options: HoneybadgerApiOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl || 'https://app.honeybadger.io/v2';
  }
  
  // Helper method to find a project by name or ID
  async findProject(projectNameOrId: string): Promise<Project | null> {
    // Try to parse as ID first
    const projectId = Number(projectNameOrId);
    
    // If it's a valid number, try to get it directly
    if (!isNaN(projectId)) {
      try {
        // Check cache first
        const cachedProject = this.projectsCache.get(projectId.toString());
        if (cachedProject) {
          return cachedProject;
        }
        
        // Fetch from API if not in cache
        const project = await this.getProject(projectId);
        this.projectsCache.set(projectId.toString(), project);
        this.projectsCache.set(project.name.toLowerCase(), project);
        return project;
      } catch (error) {
        console.error(`Error fetching project with ID ${projectId}:`, error);
        // Continue to name search if ID lookup fails
      }
    }
    
    // Search by name (case insensitive)
    const normalizedName = projectNameOrId.toLowerCase();
    
    // Check cache first
    const cachedProject = this.projectsCache.get(normalizedName);
    if (cachedProject) {
      return cachedProject;
    }
    
    // Fetch all projects and search by name
    const projects = await this.getProjects();
    
    // Cache all projects
    for (const project of projects) {
      this.projectsCache.set(project.id.toString(), project);
      this.projectsCache.set(project.name.toLowerCase(), project);
    }
    
    // Find by name (case insensitive)
    const project = projects.find(p => 
      p.name.toLowerCase() === normalizedName
    );
    
    return project || null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const authHeader = `Basic ${Buffer.from(`${this.apiToken}:`).toString('base64')}`;
    
    const reqOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, reqOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Honeybadger API error (${response.status}): ${errorText}`);
      }

      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.request<any>('/projects');
    
    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response.results)) {
        return response.results;
      } else if (response.projects && Array.isArray(response.projects)) {
        return response.projects;
      }
    }
    
    // If we couldn't find the projects, return an empty array
    console.error('Unexpected projects API response format:', response);
    return [];
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async getFaults(projectId: number, params?: Record<string, string>): Promise<Fault[]> {
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
      queryString = '?' + Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
    const response = await this.request<{ results: Fault[] }>(`/projects/${projectId}/faults${queryString}`);
    return response.results || [];
  }

  async getFault(projectId: number, faultId: number): Promise<Fault> {
    return this.request<Fault>(`/projects/${projectId}/faults/${faultId}`);
  }

  async getNotices(projectId: number, faultId: number, params?: Record<string, string>): Promise<Notice[]> {
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
      queryString = '?' + Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
    const response = await this.request<{ results: Notice[] }>(`/projects/${projectId}/faults/${faultId}/notices${queryString}`);
    return response.results || [];
  }

  // Removed updateFault method to ensure the API client is read-only

  async getAffectedUsers(projectId: number, faultId: number): Promise<Array<{ user: string, count: number }>> {
    return this.request<Array<{ user: string, count: number }>>(`/projects/${projectId}/faults/${faultId}/affected_users`);
  }
}