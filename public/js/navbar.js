$(window).on('ContentLoadFinished', e => $('.page-loader').fadeOut().addClass('hide'))


$('.tile-container').on('scroll', function() {
    let e = $('.tile-container');
    let p = e.scrollTop();
    let h = e.height();
    let o = e.outerHeight();



    e.prop('scrollHeight')
    console.log(p, h, e.prop('scrollHeight'), toPx(2.7))

});



export function initializeNavbar(){

    let navList = document.getElementById('navigation');
    let submenus = convertNodeListToArray(document.getElementsByClassName('submenu'));
    convertNodeListToArray(navList.children).forEach(listItem => {

        
        let navBtn = listItem.children[0];
        
        navBtn.addEventListener('click', e => {
            let submenu = e.currentTarget.nextElementSibling;
            if(submenu){
                
                submenus.filter(m => m.id !== submenu.id).forEach(m => m.classList.add('hide'));

                let cl = submenu.classList;
                let m = 'add';
                if(cl.contains('hide')) m = 'remove';

                cl[m]('hide')

            }


        })

        
    })

    

}


function convertNodeListToArray(nodeList){
    
    let a = [];
    for(let i = 0; i < nodeList.length; i++){
        a.push(nodeList[i])
    }

    return a

}
