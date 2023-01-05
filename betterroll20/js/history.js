
class CommandHistory {
  commands = [];
  index = 0;

  getIndex() {
    return this.index;
  }
  back(canvas) {
    action = false;
    console.log('Command History back (trying to undo an event)');
    if (this.index > 0) {
      console.log('rolling back state history');
      this.index = this.index-1
      let command = this.commands[this.index];
      command.undo(canvas);
    }
    action=true;
    return this;
  }
  forward(canvas) {
    action = false;
    console.log('Command History forward (trying to redo an event)');
    if (this.index < this.commands.length) {
      console.log('Redoing event');
      let command = this.commands[this.index];
      this.index = this.index+1
      command.execute(canvas);
    }
    action = true;
    return this;
  }
  add(command) {
    if (this.commands.length) {
      this.commands.splice(this.index, this.commands.length - this.index);
    }
    this.commands.push(command);
    this.index++;
    return this;
  }
  clear() {
    this.commands.length = 0;
    this.index = 0;
    return this;
  }
}

// use when you init your Canvas, like this.history = new CommandHistory();

class AddCommand {
  constructor(target) {
    this.target = target;
  }
  execute(canvas) {
    console.log('executing add command');
    canvas.add(this.target);
  }
  undo(canvas) {
    console.log('Undoing add command');
    canvas.getObjects().forEach((obj) => {
        console.log(this.target.translationX == obj.translationX && this.target.translationY == obj.translationY);
          if(this.target == obj) {
            console.log(obj);
            console.log(canvas.remove(obj));
        }
    });
  }
}

// When you will add object on your canvas invoke also this.history.add(new AddCommand(object, controller))

class RemoveCommand {
  constructor(target) {
    this.target = target;
  }
  execute(canvas) {
    canvas.getObjects().forEach((obj) => {
        console.log(this.target.id == obj.id);
          if(this.target.id == obj.id) {
            console.log(obj);
            console.log(canvas.remove(obj));
        }
    });
  }
  undo(canvas) {
    canvas.add(this.target);
  }
}

class TransformCommand {
    constructor(target, original) {
        this.target = target;
        this.original = original;
        this.transform = {};
        console.log(Object.entries(this.original));
        for (const [key, value] of Object.entries(this.original)) {
            this.transform[key] = this.target[key];
        }
        console.log(this.original);
        console.log(this.transform);
    }
    execute(canvas) {
        canvas.getObjects().forEach((obj) => {
            console.log(obj.id + " " + this.target.id)
            if(obj.id == this.target.id) {
                console.log("Found the matching item")
                for (const [key, value] of Object.entries(this.transform)) {
                    console.log("Changing attribute " + key + " to value " + value);
                    obj.set(key, value);
                    console.log(obj.key);
                }
            }
        });
        canvas.renderAll();
    }
    undo(canvas) {
        canvas.getObjects().forEach((obj) => {
            if(obj.id == this.target.id) {
                console.log("Found the matching item")
                console.log(Object.entries(this.original));
                for (const [key, value] of Object.entries(this.original)) {
                    console.log("Changing attribute " + key + " to value " + value);
                    obj.set(key, value);
                }
            }
        });
        canvas.renderAll();
    }
}