import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../../../../server/src/types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.base}/${path}`)
      .pipe(map(r => r.data as T));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map(r => r.data as T));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map(r => r.data as T));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.base}/${path}`)
      .pipe(map(r => r.data as T));
  }

  // FormData — interceptor adds auth header; do NOT set Content-Type (browser sets multipart boundary)
  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}/${path}`, formData)
      .pipe(map(r => r.data as T));
  }

  putForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}/${path}`, formData)
      .pipe(map(r => r.data as T));
  }
}
