import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Task, TaskStatus } from './models';
import { TasksApi } from './tasks.api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="container">
    <h1>Tasks</h1>

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="row">
        <label>Title*</label>
        <input formControlName="title" type="text" placeholder="Title" />
        <small *ngIf="form.controls.title.invalid && (form.controls.title.dirty || form.controls.title.touched)">
          Title is required (min 2 chars)
        </small>
      </div>

      <div class="row">
        <label>Description</label>
        <input formControlName="description" type="text" placeholder="Optional" />
      </div>

      <div class="row">
        <label>Due date</label>
        <input formControlName="dueDate" type="date" />
      </div>

      <div class="row">
        <label>Status</label>
        <select formControlName="taskStatus">
          <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
        </select>
      </div>

      <button type="submit" [disabled]="form.invalid">{{ editId() ? 'Update' : 'Add' }}</button>
      <button type="button" (click)="cancelEdit()" *ngIf="editId()">Cancel</button>
    </form>

    <hr />

    <div *ngIf="loading()">Loading...</div>

    <ul class="list" *ngIf="!loading()">
      <li *ngFor="let t of tasks()">
        <div class="item">
          <div class="meta">
            <strong>{{ t.title }}</strong>
            <span class="status">[{{ t.taskStatus }}]</span>
            <span class="due" *ngIf="t.dueDate">— due {{ t.dueDate | date:'yyyy-MM-dd' }}</span>
            <div class="desc" *ngIf="t.description">{{ t.description }}</div>
          </div>
          <div class="actions">
            <button (click)="beginEdit(t)">Edit</button>
            <button (click)="remove(t.id)">Delete</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
  `,
  styles: [`
    .container { max-width: 760px; margin: 2rem auto; padding: 1.5rem; border-radius: 12px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
    form .row { display: flex; flex-direction: column; margin-bottom: .75rem; }
    label { font-weight: 600; margin-bottom: .25rem; }
    input, select { padding: .5rem .6rem; border: 1px solid #ddd; border-radius: 6px; }
    button { margin-right: .5rem; padding: .45rem .8rem; border: 0; border-radius: 8px; cursor: pointer; }
    .list { list-style: none; padding: 0; margin: 0; }
    .item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: .6rem 0; }
    .meta { display: flex; flex-direction: column; }
    .desc { color: #555; margin-top: .15rem; }
    .status { margin-left: .5rem; color: #666; }
    .due { margin-left: .5rem; color: #888; }
  `]
})
export class AppComponent implements OnInit {
  // Reactive state using Angular signals (simple and OnPush-friendly)
  private _tasks = signal<Task[]>([]);
  tasks = computed(() => this._tasks());
  loading = signal<boolean>(false);
  editId = signal<number | null>(null);

  statuses = Object.values(TaskStatus);

  // Form controls; dueDate uses yyyy-MM-dd for <input type="date">
  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    description: new FormControl<string | null>(null),
    dueDate: new FormControl<string>(this.toDateInput(new Date(Date.now() + 7 * 864e5))), // +7 days by default
    taskStatus: new FormControl<TaskStatus>(TaskStatus.Pending, { nonNullable: true }),
  });

  constructor(private api: TasksApi) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: (data) => { this._tasks.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  // Create or update
  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    // Build full model for update
    const model: Task = {
      id: this.editId() ?? 0, // server will ignore for POST
      title: v.title!,
      description: v.description ?? '',
      dueDate: this.toIsoDate(v.dueDate!), // convert yyyy-MM-dd to ISO
      taskStatus: v.taskStatus!
    };

    let op$;
    if (this.editId()) {
      // PUT expects full Task (with id)
      op$ = this.api.update(model);
    } else {
      // POST expects Task without id -> strip id safely
      const { id, ...createDto } = model; // strip id to satisfy Omit<Task,'id'>
      op$ = this.api.create(createDto as Omit<Task, 'id'>);
    }

    op$.subscribe({
      next: () => { this.cancelEdit(); this.load(); },
      error: () => { /* TODO: show error toast */ }
    });
  }

  beginEdit(t: Task): void {
    this.editId.set(t.id);
    this.form.reset({
      title: t.title,
      description: t.description ?? '',
      dueDate: this.toDateInput(t.dueDate),
      taskStatus: t.taskStatus
    });
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.form.reset({
      title: '',
      description: '',
      dueDate: this.toDateInput(new Date(Date.now() + 7 * 864e5)),
      taskStatus: TaskStatus.Pending
    });
  }

  // Calls DELETE /api/tasks/{id}
  remove(id: number): void {
    if (!confirm('Delete this task?')) return;
    this.api.delete(id).subscribe({
      next: () => this.load(),
      error: () => { /* TODO: show error toast */ }
    });
  }

  // --- Helpers ---
  // Convert ISO or Date to yyyy-MM-dd for <input type="date">
  private toDateInput(d: string | Date): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    // Normalize to UTC midnight for stable yyyy-MM-dd
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString().slice(0, 10);
  }

  // Convert yyyy-MM-dd to ISO UTC (so backend receives a full datetime)
  private toIsoDate(yyyyMMdd: string): string {
    const [y, m, d] = yyyyMMdd.split('-').map(n => +n);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toISOString();
  }
}
