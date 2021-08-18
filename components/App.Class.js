module.exports = function(dbPoolConnection) {

    if(!dbPoolConnection) throw new Error(`Cannot initialize without a database connection.`);

    const AppComponent = require('./App.Fn')(dbPoolConnection)

    return {
        Student: class Student {
            constructor(student){
                this.Student = student
            }
        
            async update(updateObj){
        
                if(!this.isValid()) return;
        
                //await updateStudent(this.Student.id, updateObj)
        
            }
        
            async delete(){
        
                if(!this.isValid()) return;
        
                await deleteStudent(this.Student.id)
        
            }
        
            isValid(){
                return typeof this.Student === 'object'
            }
        
        },
        Project: class Project {
            constructor(project){
                this.Project = project
            }
        }
    }
}