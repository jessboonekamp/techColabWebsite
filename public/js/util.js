window.addEventListener('load', e => {
    $('body').on('wheel', e => {
        console.log('sss')
        $('.tool-tip').addClass('hide');
    })

})

export function bindFn(htmlDomTokenList, bindingFn, fnArgs, eventName){
    if(!htmlDomTokenList) return

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

export function getLinkDomain(link, delimiter){

    if(link){
        if(!link.includes(delimiter)){
            throw new Error('Delimiter doesn\'t exist in the string')
        }
    
        let smLinks = ['linkedin', 'facebook', 'instagram', 'github'];
        let icon = link?.split(delimiter).find(k => smLinks.includes(k));
        if(icon){
            return icon;
        }else{
            return 'link';
        }
    }else{
        return
    }
}

export function showHideSearchPane(e){

    let target = $(e.target);

    if(target.parents('.filters').length) return

    let t = $(e.currentTarget).children(':last-child');
    t.fadeToggle('fast', 'linear', handleFadeFinish)

    function handleFadeFinish(){
        let w = window.innerWidth < 1050 ? 'flex' : 'inline-flex';
        t.css('display', w).toggleClass('hide');
    }
}

export async function newFilteredSearch() {

    let form = new FormData(document.getElementsByClassName('form-bar')[0]);

    let qs = [];
    for (let [key, value] of form)
        value ? qs.push(`${key}=${value}`) : false;
    
    console.log(65, qs)

    return qs.length ? qs.join('&') : null

}

export async function assignInputClearEvents(){

    $(`input:not([type="submit"])`).on('input', e => {

        let ct = $(e.currentTarget);

        if(ct.val()){

            console.log('VALUE')

            if(ct.next().length){
                console.log('clear exists')
                return ct.next().fadeIn()

            }

            ct.parent().append(`<span class="clear-field">X</span>`)

            ct.next().on('click', e => {
                ct.val('');
                $(e.currentTarget).fadeOut()
            })

        }

    })

}

export async function getContentUris(){

    try {
        let promises = [];
        console.log(105, $('[data-image-name]'));
        $('[data-image-name]').each((i, v) => {

            v  = $(v);
            let imageName = v.attr('data-image-name');
            if(imageName) promises.push({
                fn: fetch(`/files/${imageName}/getUri`),
                imageName: imageName
            })

        });

        (await Promise.allSettled(promises.map(p => p.fn))).forEach(async r => {
            
            r.value = await r.value.json();
            
            let { imageName, uri } = r.value.Data;

            $(`[data-image-name="${imageName}"]`).each((i,v) => {

                let element = $(v);

                let tagName = element.prop('tagName');

                if(tagName === 'DIV'){
                    console.log('DIV ELEMENT');
                    element.css(`background-image`, `url("${uri}")`);
                }
                else{
                    console.log('IMG/VIDEO ELEMENT');
                    element.prop('src', uri)
                }


            })


        })

        window.dispatchEvent(new CustomEvent('ContentLoadFinished'))
        
    } catch (e) {
        console.log(e)
    }

}

export function manageToolTip(e) {
    $('.tool-tip').addClass('hide');
}