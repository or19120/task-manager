import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';
import { Task } from './models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private WebReqService: WebRequestService) {}
  getLists() {
    return this.WebReqService.get('lists');
  }
  createList(title: string) {
    // Send a request to create a list
    return this.WebReqService.post('lists', { title });
  }
  updateList(id: string, title: string) {
    // Send a request to create a list
    return this.WebReqService.patch(`lists/${id}`, { title });
  }
  deleteList(id: string) {
    return this.WebReqService.delete(`lists/${id}`);
  }
  deleteTask(listId: string, taskId: string) {
    return this.WebReqService.delete(`lists/${listId}/tasks/${taskId}`);
  }
  updateTask(listId: string, taskId: string, title: string) {
    // We want to send a web request to update a list
    return this.WebReqService.patch(`lists/${listId}/tasks/${taskId}`, {
      title,
    });
  }

  getTasksForList(listId: string) {
    return this.WebReqService.get(`lists/${listId}/tasks`);
  }
  createTask(title: string, listId: string) {
    // Send a request to create a task
    return this.WebReqService.post(`lists/${listId}/tasks`, { title });
  }

  complete(task: Task) {
    return this.WebReqService.patch(`lists/${task._listId}/tasks/${task._id}`, {
      completed: !task.completed,
    });
  }
}
