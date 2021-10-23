window.addEventListener('load', () => {

    $('.burger').on('click', e => {

        e = $(e.currentTarget);
        e.next().toggleClass('burger-show')

    })

    $('body').on('click', e => {

        let t = $(e.target);
        if(!t.parents('nav').length) $('.burger-show').removeClass('burger-show')

    })

})