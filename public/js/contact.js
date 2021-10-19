$('#contact').off().on('submit', submitContactForm)
async function submitContactForm(e){

    try {
        
        const ct = $(e.currentTarget);

        ct.children('.lds-container').remove();

        ct.append(`<div class="lds-container">
        <div>
            <div class="lds-roller">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <p>Submitting....</p>
        </div>
    </div>`);

        e.preventDefault();
        
        let apiRes = await fetch('/contact', { method: 'POST', body: new FormData(e.currentTarget) })

        if(apiRes.status === 200){

            ct.children('.lds-container').remove();

            $(e.currentTarget).addClass('success');

            ct.children().find('input:not([type="submit"]), textarea').each((i,v) => $(v).val(''));

            setTimeout(() => ct.removeClass('success'), 3000)

        }


        return false

    } catch (e) {
        console.log(e)
    }

}