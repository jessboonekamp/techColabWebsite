document.onreadystatechange = async () => {

    bindFn(document.getElementsByClassName('bin'), deleteObject);

    bindFn(document.getElementsByClassName('editStudent'), editStudent);

    bindFn(document.getElementById('searchProjects'), searchEntity, ['project'] ,'input');

}

function bindFn(htmlDomTokenList, bindingFn, fnArgs, eventName){
    
    if(!fnArgs) fnArgs = [];

    if(htmlDomTokenList instanceof HTMLCollection){
        for(let i = 0; i < htmlDomTokenList.length; i++){

            let ct = htmlDomTokenList[i];
    
            ct.addEventListener(eventName || 'click', e => bindingFn(e, ...fnArgs))
    
        }

        return
    }


    htmlDomTokenList.addEventListener(eventName || 'click', e => bindingFn(e, ...fnArgs))

}

async function deleteObject(e){

    try {

        // Prevent 'a' element default action (navigation)
        e.preventDefault();

        let ct = e.currentTarget;

        let entityType = ct.getAttribute('data-type');

        let objectId = ct.getAttribute('data-id');

        let apiRes = await fetch(`/admin/${entityType}/${objectId}`, { method: 'DELETE' });

        let status = apiRes.status;

        console.log(status)
        
    } catch (e) {
        console.log(e)
    }

}

async function editStudent(e, form, studentId){

    if(form){

        let payload = {};
        (new FormData(document.getElementsByTagName('form')[0])).forEach((v, k) => {
            console.log(v, k)
            payload[k] = v
        })

        delete payload.Files;

        let apiRes = await fetch((new URL(window.location.href)).pathname + `/${studentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
        let status = apiRes.status;
        apiRes = await apiRes.json();
        newNotificationMessage(apiRes.Message, status == 200 ? 'success' : 'error')
        return

    }

    let studentModal = document.getElementById('editStudentDialog');

    form = document.getElementsByTagName('form')[0];

    form = new FormData(form)

    let ct = e.currentTarget;

    let student = JSON.parse(ct.getAttribute('student'));
    console.log(student)

    document.querySelectorAll('input[type="text"], textarea').forEach(node => {

        let key = node.getAttribute('name');

        node.value = student[key];

        form.set(key, student[key]);

    });

    form.set('id', student.id);

    let saveBtn = document.getElementById('saveStudent');

    console.log('Removing Event...')
    saveBtn.removeEventListener('click', editStudent);

    console.log('Binding Event...')
    saveBtn.addEventListener('click', async e => editStudent(null, form, student.id));
    
    studentModal.style.display = 'block'


}

async function searchEntity(e, entityType){

    try {

        let ct = e.currentTarget;

        let dropDown = ct.nextElementSibling;
        
        let value = ct.value;

        if(value.length < 3){
            dropDown.innerHTML = ''
            return;
        }



        dropDown.innerHTML = '';

        let fieldName = ct.getAttribute('name');

        let apiRes = await (await fetch(`/admin/${entityType}/search?${fieldName}=${value}`)).json();

        let newHTML = '<div class="no-results">No results</div>';
        if(apiRes.Data.length){
            newHTML = apiRes.Data.map(res => `<div class="result">${res.title}</div>`).join('')
        }

        ct.nextElementSibling.innerHTML = newHTML

    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')

    }

}

function newNotificationMessage(message, className){

    switch(className){
        case 'success':
            className = 'success'
        break;
        default:
            className = 'danger'
    }

    let currentAlerts = document.getElementsByClassName('alert');
    if(currentAlerts.length) currentAlerts[0].remove();

    let body = document.getElementsByTagName('body')[0]

    let a = document.createElement('div');
    a.classList.add('alert', `alert-${className}`, 'action-msg')
    a.innerText = message;

    body.appendChild(a)

    

}