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