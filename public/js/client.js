window.onload = async () => {

    bindFn(document.getElementsByClassName('bin'), deleteObject);

    bindFn(document.getElementsByClassName('editStudent'), editStudent);

    bindFn(document.getElementById('searchProjects'), searchEntity, ['project'] ,'input');

    bindFn(document.getElementsByTagName('body'), hideDropdowns);

    bindFn(document.getElementsByTagName('form')[0], submitForm, null, 'submit')

}

function hideDropdowns(e) {

    // If we're clicking in the dropdown, exit immediately so we don't hide the dropdown
    if(e.target.closest('.dropdown')) return;
    let els = document.getElementsByClassName('searchResults');
    for(let i = 0; i < els.length; i++){
        let c = els[i];
        c.classList.add('hide')
    }

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

        let payload = formToJSON(form)

        delete payload.Files;

        let apiRes = await fetch((new URL(window.location.href)).pathname + `/${studentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: payload });
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

        e.stopPropagation()

        let ct = e.currentTarget;

        let dropDown = ct.nextElementSibling;

        let selectedOptList = dropDown.nextElementSibling;

        console.log(selectedOptList)

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
            newHTML = `<div class="dropdown searchResults">${apiRes.Data.map(res => `<div class="result"><input type="checkbox" data-${entityType}="${res.id}"><span>${res.title}</span></div>`).join('')}</div>`
        }

        dropDown.innerHTML = newHTML;

        if(apiRes.Data.length){

            let clickEls = dropDown.childNodes[0].childNodes;
            for(let i = 0; i < clickEls.length; i++){

                let c = clickEls[i];

                // Click the checkbox
                c.addEventListener('click', e => {

                    let cbx = e.currentTarget.childNodes[0];

                    cbx.click();

                    let thisId = cbx.getAttribute(`data-${entityType}`);

                    if(cbx.checked){
                        
                        if(selectedOptList.querySelector(`div.selected-opt[data-${entityType}="${thisId}"]`)) return;

                        return selectedOptList.appendChild(addSelectOption(cbx.nextElementSibling.innerText, entityType, thisId))

                    }

                    let thisOpt = selectedOptList.querySelector(`div.selected-opt[data-${entityType}="${thisId}"]`);

                    thisOpt?.remove()

                })


            }

        }

    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')

    }

}

function addSelectOption(text, entityType, dataAttrVal){

    let o = document.createElement('div');
    o.classList.add('selected-opt');

    if(dataAttrVal) o.setAttribute(`data-${entityType}`, dataAttrVal);
    
    let s = document.createElement('span');
    s.innerText = text;
    let i = document.createElement('img');
    i.src = '/public/images/icons/bin.svg';
    i.addEventListener('click', e => e.currentTarget.parentElement.remove());
    o.alt = 'Bin';
    o.appendChild(s);
    o.appendChild(i);

    return o
}

function getCheckboxCheckedOptions(targetEl){

    let selectedOpts = [];
    let opts = targetEl.childNodes;
    for(let i = 0; i < opts.length; i++){

        let o = opts[i];

        let cbx = o.childNodes[0];

        if(cbx.value) selectedOpts.push(cbx.getAttribute('data'))

    }

    return selectedOpts

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

async function submitForm(e){

    let status;
    e.preventDefault();
    try {
        
        console.log(e)
        let form = formToJSON(e.target);

        let selectedProjs = (convertNodeListToArray(document.querySelectorAll(`div.selected-opt[data-project]`))).map(el => {
            return Number(el.getAttribute('data-project'))
        });

        if(selectedProjs.length) {
            form = JSON.parse(form);
            form.ProjectIDs = selectedProjs;
            form = JSON.stringify(form)
        }
        
        let apiRes = await fetch(window.location.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: form })

        status = apiRes.status;

        if(status = 200){
            apiRes = await apiRes
            console.log(apiRes)
        }


  

    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')
    }

}

function convertNodeListToArray(nodeList){
    
    let a = [];
    for(let i = 0; i < nodeList.length; i++){
        a.push(nodeList[i])
    }

    return a

}

function formToJSON(form){
    let o = {};
    (new FormData(form)).forEach((v, k) => {
        o[k] = v
    })

    return JSON.stringify(o)
}