import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from './models';

@Injectable({ providedIn: 'root' })
export class TasksApi {
  // Use proxy so we can call /api directly from ng serve
  private baseUrl = '/api/tasks';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Task[]> {
    return this.http.get<Task[]>(this.baseUrl);
  }

  get(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/${id}`);
  }

  // Backend expects full model (without Id) for POST; Id will be assigned server-side
  create(task: Omit<Task, 'id'>): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, task);
  }

  // Backend PUT receives full Task model
  update(task: Task): Observable<Task> {
    return this.http.put<Task>(this.baseUrl, task);
  }

  // Maps to [HttpDelete("{id:int}")] -> _repo.Remove(id)
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
