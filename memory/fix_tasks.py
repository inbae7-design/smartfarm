import win32com.client
import os

def fix_tasks():
    scheduler = win32com.client.Dispatch('Schedule.Service')
    scheduler.Connect()
    root_folder = scheduler.GetFolder('\\')
    
    tasks = root_folder.GetTasks(0)
    target_tasks = []
    
    for task in tasks:
        name = task.Name
        if '리포트' in name or '스마트팜' in name or '출근길' in name:
            target_tasks.append(task)
            
    python_path = r"C:\Users\copi7_000\AppData\Local\Programs\Python\Python313\python.exe"
    
    for task in target_tasks:
        try:
            print(f"Fixing task: {task.Name}")
            definition = task.Definition
            action = definition.Actions.Item(1)
            if action.Type == 0:  # ExecAction
                if action.Path.lower() == 'python':
                    # Current args might be the full script path
                    script_path = action.Arguments
                    
                    action.Path = python_path
                    action.Arguments = script_path
                    
                    # Update task
                    root_folder.RegisterTaskDefinition(
                        task.Name,
                        definition,
                        4, # TASK_UPDATE
                        None, None, 3 # LogonType
                    )
                    print(f"Successfully updated {task.Name}")
        except Exception as e:
            print(f"Error processing {task.Name}: {e}")

if __name__ == '__main__':
    fix_tasks()
