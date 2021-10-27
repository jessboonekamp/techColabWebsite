import { initializeNavbar } from './navbar.js';
import { bindFn, getContentUris } from './util.js';

window.addEventListener('load', async e => {

    console.log(dateTimeToDBDateTimeString())

    bindFn(document.getElementsByClassName('bin'), deleteObject);

    bindFn(document.getElementsByClassName('editStudent'), editStudent);

    bindFn(document.getElementsByClassName('editProject'), editProject);

    bindFn(document.getElementsByClassName('editAbout'), editAbout)

    bindFn(document.getElementById('searchProjects'), searchEntity, ['project'] ,'input');

    bindFn(document.getElementsByTagName('body'), hideDropdowns);

    bindFn(document.getElementsByTagName('form')[0], submitForm, null, 'submit');

    bindFn(document.getElementById('studentFiles'), addFileToList, [document.getElementsByClassName('attachedFiles')[0]], 'change');

    bindFn(document.getElementById('projectFiles'), addFileToList, [document.getElementsByClassName('attachedFiles')[0]], 'change');

    bindFn(document.getElementById('aboutFiles'), addFileToList, [document.getElementsByClassName('attachedFiles')[0]], 'change');

    bindFn(document.getElementById('searchStudents'), searchEntity, ['student'], 'input');

    initializeNavbar();

    initialize();

    await getContentUris();

    // Find images on the page

});

async function initialize(){

    // let l = window.location.href;
    // switch(true){
    //     case l.endsWith('about'):

    //         let media = await fetch(`/admin/`)
            
            

    //     break;
    // }

    // Initialize delete and hero click events

}

function initCheckboxEvents(callingFn) {

    console.log(callingFn, $('.cbx'))
    $('.cbx').off().on('click', async e => {

        $('.cbx input:checked').each((i,v) => {
            $(v).prop('checked', false).parent().removeClass('checked')
        });

        let cbx = $(e.currentTarget).toggleClass('checked');
        let i = cbx.children('input');
        let cv = i.prop('checked');
        i.prop('checked', cv ? false : true)

        let ct = $(e.currentTarget);
        let fileId = ct.prev().children().attr('data-id');
        if(fileId && !ct.parent('.selected-opt').attr('data-ishero')) await setHeroImage(ct, fileId)

    })

}

async function setHeroImage(e, fileId) {

    try {
        
        let entityType, owningObjId;
        if(window.location.href.includes('project')){
            entityType = 'project';
            owningObjId = $('#editProjectDialog').attr('data-projectid')
        } else{
            entityType = 'student';
            owningObjId = $('#editStudentDialog').attr('data-studentid')

        }

        // Clear the hero flag from all images
        $('[data-ishero]').removeAttr('data-ishero');


        let apiRes = await fetch(`/${entityType}/${owningObjId}/files/${fileId}`, { method: 'PATCH', body: JSON.stringify({ is_hero: true }), headers: { 'Content-Type': 'application/json' } });

        let status = apiRes.status;

        e.attr('data-ishero', true);

        apiRes = await apiRes.json();

        if(status !== 200) throw new Error(apiRes.Message);

        newNotificationMessage(apiRes.Message, 'success')


    } catch (e) {
        newNotificationMessage(e.message, 'error')
    }

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

async function deleteObject(e){

    try {

        // Prevent 'a' element default action (navigation)
        e.preventDefault();

        let ct = e.currentTarget;

        let entityType = ct.getAttribute('data-type');

        let objectId = ct.getAttribute('data-id');

        let apiRes = await fetch(`/admin/${entityType}/${objectId}`, { method: 'DELETE' });

        let status = apiRes.status;

        console.log(145, apiRes)
        newNotificationMessage((entityType.charAt(0).toUpperCase() + entityType.slice(1) + ' has been deleted'), 'success')

        if(status === 204) $(ct).parents('.card').fadeOut().remove();

        
    } catch (e) {
        newNotificationMessage(e.message, 'error')
    }
}

// MOVE TO UTILITY FILE
async function uploadFiles(fileEl, entityType, objectId) {

    try {

        let form = new FormData(document.getElementsByTagName('form')[0]);
        ['biography','last_name','first_name'].forEach(p => form.delete(p));
        
        form = setHeroImageSelection(form);

        await fetch(`/${entityType}/${objectId}/addFiles`, { method: 'POST', body: form });

        return form


    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')
    }

}

async function deleteObjectLink(objectId, entityType){

    try {

        let apiRes = await fetch(`/admin/${entityType}/link/${objectId}`, { method: 'DELETE' });
        if(apiRes.status === 204) return;
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

            fileEl.value = null;

            form.delete('Files')

        }

        getLinkSelection(form, 'project')

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
    studentModal.setAttribute('data-studentid', studentId);
    let student = await getStudent(studentId);
    console.log(student)

    let studMedia = await getMedia(studentId, 'student');

    $('.attachedFiles').html('');
    let commitedFileList = document.getElementsByClassName('existingFiles')[0];
    studMedia.length ? await addFileToList(null, commitedFileList, studMedia) :  commitedFileList.innerHTML = '';

    initCheckboxEvents()

    let projList = document.getElementById('selectedProjects');
    projList.innerHTML = '';
    document.getElementsByClassName('noProject')[0]?.remove();
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
        console.log(student, key)
        node.value = student[key] && /[a-zA-Z]{0,}/.exec(student[key])?.length ? student[key] : '';

        form.set(key, student[key]);

    });
    document.getElementsByClassName('attachedFiles')

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
    
    $('#closeDialog').off().on('click', e => {
        $('input[type="file"]').val('')
        document.getElementsByClassName('attachedFiles')[0].innerHTML = '';
        studentModal.style.display = 'none'
    });

    studentModal.style.display = 'block'
    await getContentUris();

}

async function editProject(e, form, projectId, saveBtn){

    let projectModal = document.getElementById('editProjectDialog');
    let modalFooter = document.getElementsByClassName('modal-footer')[0];

    if(form){
        form = new FormData(document.getElementsByTagName('form')[0]);

        form.delete('first_name');
        if(form.get('Files')){

            let fileEl = document.getElementById('projectFiles');


            if(fileEl.files.length) {

                let uploadForm = await uploadFiles(fileEl, 'project', projectId);

                fileEl.value = null;

                form.set('heroImage', uploadForm.get('heroImage'))

            }

            form.delete('Files')
        }

        getLinkSelection(form, 'student')
    
        let apiRes = await fetch((new URL(window.location.href)).pathname + `/${projectId}`, { method: 'PATCH', body: form});

        let status = apiRes.status;
        apiRes = await apiRes.json();

        console.log(apiRes)

        newNotificationMessage(apiRes.Message, status == 200 ? 'success' : 'error')
        return projectModal.style.display = 'none';

    }

    form = document.getElementsByTagName('form')[0];

    form = new FormData(form);

    let ct = e.currentTarget;

    projectId = ct.getAttribute('data-projectid');
    projectModal.setAttribute('data-projectid', projectId);
    let project = await getProject(projectId);

    let projMedia = await getMedia(project.id, 'project');
    $('.attachedFiles').html('');
    let commitedFileList =  document.getElementsByClassName('existingFiles')[0];
    projMedia.length ? await addFileToList(null, commitedFileList, projMedia) :  commitedFileList.innerHTML = '';


    console.log(projMedia)
    let studList = document.getElementById('selectedStudents')
    studList.innerHTML = '';
    document.getElementsByClassName('noStudent')[0]?.remove();
    if(project?.students?.length){

        project.students.map(s => {
            let thisOpt = addSelectOption(`${s.first_name} ${s.last_name}`, 'student', s.id, true);
            thisOpt.childNodes[1].setAttribute('data-linkid', s.link_id);
            studList.appendChild(thisOpt)
        })

    }else{

        let noVal = document.createElement('div');
        noVal.innerText = 'This project doesn\'t have any current students';
        noVal.classList.add('no-val-placeholder', 'noStudent');
        studList.appendChild(noVal);

    }


    document.querySelectorAll('input[type="text"]:not(.search-input), textarea, select, input[type="date"]').forEach(node => {

        let key = node.getAttribute('name');

        if(/date/.test(key)) project[key] = dateTimeToDBDateTimeString(project[key]);

        node.value = project[key];

        form.set(key, project[key])

    });

    form.set('id', project.id);
    saveBtn = document.getElementById('saveProject')

    if(saveBtn){

        console.log('Removing Event...');

        let newSaveBtn = document.createElement('button');
        newSaveBtn.classList = saveBtn.classList;
        newSaveBtn.innerText = saveBtn.innerText;
        newSaveBtn.id = saveBtn.id;
    
        modalFooter.replaceChild(newSaveBtn, saveBtn);
        saveBtn = newSaveBtn;
    }

    saveBtn.addEventListener('click', async e => editProject(null, 'get', project.id));
    document.getElementById('closeDialog').addEventListener('click', e => {
        document.getElementsByClassName('attachedFiles')[0].innerHTML = '';
        projectModal.style.display = 'none';

    })

    projectModal.style.display = 'block';
    await getContentUris();

}

async function editAbout(e){
    let ct = e.currentTarget
    let form =  document.getElementsByTagName('form')[0];
    let aboutId = form.getAttribute('data-id');
    form = new FormData(form);
    if(form){
        

        if(form.get('Files')){

            let fileEl = document.getElementById('aboutFiles');


            if(fileEl.files.length) {

                let uploadForm = await uploadFiles(fileEl, 'about', aboutId);

                fileEl.value = null;

                form.set('heroImage', uploadForm.get('heroImage'))

            }

            form.delete('Files')
        }
    
        let apiRes = await fetch(window.location.href, { method: 'POST', body: form});

        let status = apiRes.status;
        apiRes = await apiRes.json();

        console.log(apiRes)

        newNotificationMessage(apiRes.Message, status == 200 ? 'success' : 'error')
    }

    form = document.getElementsByTagName('form')[0];

    form = new FormData(form);

    let about = await fetch(`/admin/about/content`)

    let aboutMedia = await getMedia(ct.getAttribute('data-aboutid'), 'about');
    console.log(467, aboutMedia);
    $('.attachedFiles').html('');
    let commitedFileList =  document.getElementsByClassName('existingFiles')[0];
    aboutMedia.length ? await addFileToList(null, commitedFileList, aboutMedia) :  commitedFileList.innerHTML = '';
    initCheckboxEvents()
    await getContentUris();
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
        if(apiRes?.Data?.length){
            newHTML = `<div class="dropdown searchResults">${apiRes.Data.map(res => `<div class="result"><input type="checkbox" data-${entityType}="${res.id}"><span>${res.title || `${res.first_name}  ${res.last_name}`}</span></div>`).join('')}</div>`
        }

        dropDown.innerHTML = newHTML;

        if(apiRes?.Data?.length){
            
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
    let noStudentPlaceholder = $('.noStudent');
    noStudentPlaceholder ? noStudentPlaceholder.remove() : '';
    let o = document.createElement('div');
    o.classList.add('selected-opt');

    if(dataAttrVal) o.setAttribute(`data-${entityType}`, dataAttrVal);
    
    let s = document.createElement('span');
    s.innerText = text;
    let i = document.createElement('img');
    i.classList.add('btn-icon');
    if(isCommitted) {
        i.classList.add('object-committed');
        o.classList.add('committed')
    }

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

    let target = document.getElementsByClassName('admin-pane-outer')[0];

    let a = document.createElement('div');
    a.classList.add('alert', `alert-${className}`, 'action-msg')
    a.innerText = message;

    target.appendChild(a)

    

}

async function submitForm(e){

    let status;
    e.preventDefault();
    try {
        let useEntityType = e.target.parentElement.classList.contains('student') ? 'project' : 'student';
        
        if(useEntityType === 'about') return;

        let form = new FormData(e.target); //formToJSON(e.target);

        getLinkSelection(form, useEntityType);

        form = setHeroImageSelection(form);

        //let apiRes = await fetch(window.location.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: form })
        await fetch(window.location.href, { method: 'POST', body: form })


    } catch (e) {
        console.log(e)
        newNotificationMessage(e.message, 'error')
    }

}



function setHeroImageSelection(form) {
    let fileEl = $(`input[type="file"]`)[0];
    let heroImage = $('.cbx.checked');
    let imageName = heroImage.prev().children().attr('data-imagename');
    if (heroImage && fileEl.files.length) {
        let files = fileEl.files;
        for (let i = 0; i < files.length; i++) {
            let f = files[i];
            if (f.name === imageName) {
                form.set('heroImage', f.name);
            }
        }
    }

    return form
}

function getLinkSelection(form, entityType) {
    let selectedLInks = (convertNodeListToArray(document.querySelectorAll(`div.selected-opt[data-${entityType}]:not(.committed)`))).map(el => {
        console.log(505, el)
        return Number(el.getAttribute(`data-${entityType}`));
    });
    // console.log(selectedLInks)

    if (selectedLInks.length) {
        form.set(entityType === 'student' ? `StudentIDs` : `ProjectIDs`, selectedLInks)

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

async function addFileToList(e, listEl, committedFileList){

    let el = e?.target;
    let f = el?.files;

    async function readFile(file){

        return await new Promise((resolve, reject) => {

            let fileReader = new FileReader();
            fileReader.readAsDataURL(file)
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = error => reject(error);
            return fileReader

        })

    }

    function removeFile(e){
            
        let t = e.target;

        console.log(t)

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
        t.parentElement.parentElement.remove()
        
    }

    if(f){
        
        for(let i = 0; i < f.length; i++){

            let thisFile = f[i];

            await createFileEl(thisFile, removeFile, listEl, true, false)

        }
    
    } else if(Array.isArray(committedFileList)){

        // Clear the element first
        listEl.innerHTML = '';

        committedFileList.forEach(async file => {

            let thisFileEl = await createFileEl(file, null, listEl, false, true);

            // If this is the hero, check the isHeroImage checkbox
            if(file.is_hero){
                thisFileEl = $(thisFileEl);                
                thisFileEl.children('.cbx').trigger('click')
            }

        })



    } else{
        throw new Error(`Invalid arguments.`)
    }


    async function createFileEl(file, trashBinHandlerFn, targetList, readFromDisk, commitStatus){
        let fileBox = document.createElement('div');
        fileBox.classList.add('selected-opt', 'd-f', 'file-opt');
        if(file?.is_hero) fileBox.setAttribute('data-ishero', true);
        let s = document.createElement('div');
        s.classList.add('file');
        s.setAttribute('data-image-name', file.name)
        !commitStatus ? s.style.backgroundImage = `url("${readFromDisk ? await readFile(file) : file.path}")` : '';
        fileBox.append(s);
        let imgSpan = document.createElement('span');
        imgSpan.classList.add('action-icon');
        let img = document.createElement('img');
        img.setAttribute('data-imagename', file.name);
        if(file?.id){
            img.setAttribute('data-type', 'media')
            img.setAttribute('data-id', file.id)
        }

        img.src = '/public/images/icons/bin.svg';
        img.classList.add('btn-icon', 'preview-trash-bin');
        img.addEventListener('click', typeof trashBinHandlerFn === 'function' ? trashBinHandlerFn : async e => {
            console.log(e)
            // FETCH DELETE to api endpoint
            await deleteObject(e)
            // Then remove on success status code
            e.target.parentElement.parentElement.remove()
        });

        let cbx = document.createElement('span');
        cbx.title = 'Make this image the hero image';
        cbx.classList.add('cbx', 'p-abs');
        let cbxInput = document.createElement('input');
        cbxInput.type = 'checkbox';
        cbxInput.checked = false;
        cbx.appendChild(cbxInput);


        imgSpan.append(img);

        fileBox.appendChild(imgSpan);

        fileBox.appendChild(cbx)

        targetList.appendChild(fileBox);

        return fileBox


    }

    // Rebind all checkbox events
    initCheckboxEvents('addFileToList');

}

async function getMedia(id, entityType){
    try {
        
        let apiRes = await fetch(`/${entityType}/${id}/files`)

        return (await apiRes.json()).Data

    } catch (e) {
     
        throw new Error(`Couldn't fetch Object-${id} media. Error: ${e.message}`)

    }
}

async function getStudent(id){
    try {
        
        let apiRes = await fetch(`/student/search?id=${id}`);

        return await apiRes.json()


    } catch (e) {
        throw new Error(`Couldn't fetch Student ${id}. Error: ${e.message}`)
    }
}

async function getProject(id){
    try {
        
        let apiRes = await fetch(`/project/search?id=${id}`);

        return await apiRes.json()


    } catch (e) {
        throw new Error(`Couldn't fetch Project ${id}. Error: ${e.message}`)
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

function getStudentSelection(form) {
    let selectedStudents = (convertNodeListToArray(document.querySelectorAll(`div.selected-opt[data-student]`))).map(el => {
        return Number(el.getAttribute('data-student'));
    });

    console.log(selectedStudents)

    if (selectedStudents.length) {
        form.set('StudentIDs', selectedStudents);
        // form = JSON.parse(form);
        // form.ProjectIDs = selectedProjs;
        // form = JSON.stringify(form)
    }

}

function dateTimeToDBDateTimeString(dateTime, toDbString){

    let format = toDbString ? 'YYYY-MM-DDTHH:mm:ss' : 'YYYY-MM-DD';

    let value;
    if(dateTime)
        value = moment(dateTime).format(format);
    else
        value = moment(new Date()).format(format);

    return value


}