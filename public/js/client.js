document.onreadystatechange = async () => {

    bindFn(document.getElementsByClassName('bin'), deleteObject)

}

function bindFn(htmlDomTokenList, bindingFn){

    for(let i = 0; i < htmlDomTokenList.length; i++){

        let ct = htmlDomTokenList[i];

        ct.addEventListener('click', bindingFn)

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

        console.log(status)
        
    } catch (e) {
        console.log(e)
    }

}

