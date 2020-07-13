import { Component, OnInit } from '@angular/core';
import { TaskService } from 'src/app/task.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Task } from 'src/app/models/task.model';
import { List } from 'src/app/models/list.model';
import { WebRequestService } from '../../web-request.service';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss'],
})
export class TaskViewComponent implements OnInit {
  lists: List[];
  tasks: Task[];
  selectedListId: string;
  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params: Params) => {
      if (params.listId) {
        this.selectedListId = params.listId;
        this.taskService
          .getTasksForList(params.listId)
          .subscribe((tasks: Task[]) => {
            this.tasks = tasks;
          });
      } else {
        this.tasks = undefined;
      }
    });
    this.taskService.getLists().subscribe((lists: List[]) => {
      this.lists = lists;
    });
  }
  onTaskClick(task: Task) {
    this.taskService.complete(task).subscribe(() => {
      console.log('updated');
      task.completed = !task.completed;
    });
  }
  onDeleteListClick() {
    this.taskService.deleteList(this.selectedListId).subscribe(() => {
      this.router.navigate(['/lists']);
      console.log('Deleted List');
    });
  }
  onDeleteTaskClick(id: string) {
    this.taskService.deleteTask(this.selectedListId, id).subscribe(() => {
      this.tasks = this.tasks.filter((value) => value._id !== id);
      console.log('Task Deleted');
    });
  }
}
