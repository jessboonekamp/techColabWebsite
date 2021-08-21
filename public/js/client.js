window.addEventListener('load', async e => {

    bindFn(document.getElementsByClassName('bin'), deleteObject);

    bindFn(document.getElementsByClassName('editStudent'), editStudent);

    bindFn(document.getElementById('searchProjects'), searchEntity, ['project'] ,'input');

    bindFn(document.getElementsByTagName('body'), hideDropdowns);

    bindFn(document.getElementsByTagName('form')[0], submitForm, null, 'submit');

    bindFn(document.getElementById('studentFiles'), addFileToList, [document.getElementsByClassName('attachedFiles')[0]], 'change')

});

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

async function uploadFiles(fileEl, entityType, objectId) {

    try {

        let form = new FormData(document.getElementsByTagName('form')[0]);
        ['biography','last_name','first_name'].forEach(p => form.delete(p));



        let apiRes = await fetch(`/${entityType}/${objectId}/addFiles`, { method: 'POST', body: form });




    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')
    }

}

async function deleteObjectLink(objectId, entityType){

    try {

        let apiRes = await fetch(`/admin/${entityType}/link/${objectId}`, { method: 'DELETE' });

        if(apiRes.status = 204) return;

        apiRes = await apiRes.json();
        
        if(apiRes?.Message) throw apiRes.Message;

    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')
    }
}

async function editStudent(e, form, studentId, saveBtn){

    let studentModal = document.getElementById('editStudentDialog');
    let modalFooter = document.getElementsByClassName('modal-footer')[0];

    if(form){

        // let payload = formToJSON(form)
        form = new FormData(document.getElementsByTagName('form')[0]);

        // delete payload.Files;
        form.delete('title');
        if(form.get('Files')){
           
            let fileEl = document.getElementById('studentFiles');
            if(fileEl.files.length) await uploadFiles(fileEl, 'student', studentId)

        }

        getProjectSelection(form)

        //let apiRes = await fetch((new URL(window.location.href)).pathname + `/${studentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: payload });
        let apiRes = await fetch((new URL(window.location.href)).pathname + `/${studentId}`, { method: 'PATCH', body: form });
        let status = apiRes.status;
        apiRes = await apiRes.json();
        newNotificationMessage(apiRes.Message, status == 200 ? 'success' : 'error')
        return studentModal.style.display = 'none'

    }

    form = document.getElementsByTagName('form')[0];

    form = new FormData(form);

    let ct = e.currentTarget;
    studentId = ct.getAttribute('data-studentid');

    let student = await getStudent(studentId);
    let projList = document.getElementById('selectedProjects');
    projList.innerHTML = '';
    document.getElementsByClassName('noProject')[0]?.remove()
    if(student?.projects?.length){

       //thisOpt.childNodes[1].setAttribute('data-linkid', )
        student.projects.map(p => {
            let thisOpt = addSelectOption(p.title, 'project', p.id, true);
            thisOpt.childNodes[1].setAttribute('data-linkid', p.link_id);
            projList.appendChild(thisOpt)
        })

    } else{
        let noVal = document.createElement('div');
        noVal.innerText = 'This student isn\'t collaborating on any projects yet';
        noVal.classList.add('no-val-placeholder', 'noProject');
        projList.appendChild(noVal)
    }

    document.querySelectorAll('input[type="text"], textarea').forEach(node => {

        let key = node.getAttribute('name');

        node.value = student[key] && /[a-zA-Z]{0,}/.exec(student[key])?.length ? student[key] : '';

        form.set(key, student[key]);

    });

    form.set('id', student.id);
    saveBtn = document.getElementById('saveStudent');
    if(saveBtn){

        console.log('Removing Event...');

        let newSaveBtn = document.createElement('button');
        newSaveBtn.classList = saveBtn.classList;
        newSaveBtn.innerText = saveBtn.innerText;
        newSaveBtn.id = saveBtn.id;
    
        modalFooter.replaceChild(newSaveBtn, saveBtn);
        saveBtn = newSaveBtn
    }
    

    console.log('Binding Event...')
    saveBtn.addEventListener('click', async e => editStudent(null, 'get', student.id));
    
    document.getElementById('closeDialog').addEventListener('click', e => {
        studentModal.style.display = 'none'
    })

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

function addSelectOption(text, entityType, dataAttrVal, isCommitted){

    let o = document.createElement('div');
    o.classList.add('selected-opt');

    if(dataAttrVal) o.setAttribute(`data-${entityType}`, dataAttrVal);
    
    let s = document.createElement('span');
    s.innerText = text;
    let i = document.createElement('img');
    i.classList.add('btn-icon');
    if(isCommitted) i.classList.add('object-committed');
    i.src = '/public/images/icons/bin.svg';
    i.addEventListener('click', async e => {

      

        if(e.target.classList.contains('object-committed')){

            await deleteObjectLink(Number(e.target.getAttribute('data-linkid')), entityType)

        }

        e.target?.parentElement?.remove();

    });
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

    let target = document.getElementsByClassName('pane-outer')[0];

    let a = document.createElement('div');
    a.classList.add('alert', `alert-${className}`, 'action-msg')
    a.innerText = message;

    target.appendChild(a)

    

}

async function submitForm(e){

    let status;
    e.preventDefault();
    try {
        
        console.log(e)
        let form = new FormData(e.target); //formToJSON(e.target);

        getProjectSelection(form);
        
        //let apiRes = await fetch(window.location.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: form })
        let apiRes = await fetch(window.location.href, { method: 'POST', body: form })

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

function getProjectSelection(form) {
    let selectedProjs = (convertNodeListToArray(document.querySelectorAll(`div.selected-opt[data-project]`))).map(el => {
        return Number(el.getAttribute('data-project'));
    });

    if (selectedProjs.length) {
        form.set('ProjectIDs', selectedProjs);
        // form = JSON.parse(form);
        // form.ProjectIDs = selectedProjs;
        // form = JSON.stringify(form)
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

async function addFileToList(e, listEl){

    let el = e.target;
    let f = el.files;

    async function readFile(file){

        return await new Promise((resolve, reject) => {

            let fileReader = new FileReader();
            fileReader.readAsDataURL(file)
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = error => reject(error);
            return fileReader

        })

    }

    for(let i = 0; i < f.length; i++){

        let thisFile = f[i];
        let o = document.createElement('div');
        o.classList.add('selected-opt', 'd-f');
        let s = document.createElement('div');
        s.classList.add('file')
        s.style.backgroundImage = `url("` + await readFile(thisFile) + `")`;
        o.appendChild(s);
        let img = document.createElement('img');
        img.setAttribute('data-imagename', thisFile.name);
        img.src = '/public/images/icons/bin.svg';
        img.classList.add('btn-icon', 'preview-trash-bin');
        img.addEventListener('click', e => {
            
            let t = e.target;

            // Get this file's imagename attribute
            let thisFile = t.getAttribute('data-imagename');
            
            // Create a new array of files, omitting the one that was clicked for removal
            let newFiles = Array.from(f).filter(f => { return f.name !== thisFile});

            // Recreate the Input File element
            let newEl = document.createElement('input');
            newEl.type = 'file';
            newEl.name = 'Files';
            newEl.id = el.id;
        
            // Transfer the remaining files to the new element
            let dt = new DataTransfer();
            newFiles.forEach(f => { dt.items.add(f) });
            newEl.files = dt.files;

            // Remove the old element
            // Append the new element
            el.parentElement.replaceChild(newEl, el);

            // Rebind existing events
            bindFn(newEl, addFileToList, [ listEl ], 'change');
        
            // Remove the file that had its Bin icon clicked
            e.target.parentElement.remove()
            
        });

        o.appendChild(img);
        listEl.appendChild(o)

    }

}

async function getStudent(id){
    try {
        
        let apiRes = await fetch(`/admin/student/search?id=${id}`);

        return (await apiRes.json()).Data


    } catch (e) {
        throw new Error(`Couldn't fetch Student ${id}. Error: ${e.message}`)
    }
}