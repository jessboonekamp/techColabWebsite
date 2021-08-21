window.addEventListener('load', initializeNavbar);

function initializeNavbar(){

    let navList = document.getElementById('navigation');
    console.log(navList.childNodes)
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
