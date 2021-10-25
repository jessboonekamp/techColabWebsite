import * as util from './util.js';
let { bindFn, getLinkDomain, showHideSearchPane, newFilteredSearch, assignInputClearEvents, getContentUris } = util;

window.addEventListener('load', async e => {

    let start = 7, end = 12, page = 2, totalRows = 0;

    let abortController = new AbortController();

    await assignInputClearEvents();

    bindFn(document.getElementsByClassName('search-filter-box')[0], showHideSearchPane);

    bindFn($(`button:contains('Close')`)[0], closeFloatingContainer);

    bindFn($(`button:contains('Previous')`)[0], changeFloatingContainer, ["Previous"]);

    bindFn($(`button:contains('Next')`)[0], changeFloatingContainer, ["Next"]);

    await searchProjects(null, null, null, null, totalRows);

    $('.form-bar').on('submit', searchProjects);

    bindFn(document.getElementsByTagName('body')[0], loadDataOnScroll, null, 'wheel')

    async function loadDataOnScroll(e) {

        abortController.abort();

        abortController = new AbortController();
    
        let bodyHeight = document.getElementsByTagName('body').item(0).scrollHeight;

        console.log(window.innerHeight + window.scrollY)
        if(window.innerHeight + window.scrollY == bodyHeight && (end < totalRows || !totalRows)){
            let pagination = await searchProjects(null, start, end, page, totalRows, true, abortController.signal);
            console.log('CURRENT PAGINATION: ', pagination)

            totalRows = pagination.totalRows;

            start = pagination.start += 7;

            end = start + 6;

            page = pagination.page += 1

        }
    
    }


})



window.addEventListener('scroll', e => {
    $('.prof-card').addClass('hide')
})


function scrollContainerHorizontally(e, container) {

    let ct = $(e.currentTarget);

    let deltaY = e.originalEvent.deltaY;

    let curPos = container.scrollLeft();

    let c = container[0];

    c.scroll({
        left: curPos += deltaY,
        top: 0,
        behavior: 'smooth'
    })



}

function expandTile(e, project){

    if($(e.target).hasClass('thumb')) return;

    $('body').addClass('mob-no-scroll-y');
    
    let ct = $(e.currentTarget);

    $('.expanded').removeClass('expanded')

    ct.addClass('expanded')

    let ctIndex = ct.index();

    ct.attr('data-tile-index', ctIndex)

    let box = $('.floating-box').removeClass('hide')

    $('.tile-blow-up').removeClass('tile-blow-up')

    $('.frost').removeClass('hide');

    box = box.children('.box-content').html('');
    
    ct.clone().appendTo(box)

    let videoTargetBox = box.children('.tile');

    videoTargetBox.children('.video-player, .media-control').remove();
    let heroClass = "hero-media";
    videoTargetBox.append(`<div class="video-player hide"></div><div class="media-control">${project.media.map(m => {
        
        if(isVideo(m.path)) return `<video class="${m.is_hero ? "hero-media" : ''} thumb"><source data-image-name="${m.name}" src="${m.path}" type="video/${m.path.substring(m.path.lastIndexOf('.') + 1)}"></video>`;
        
        return `<img  src="${m.path}" alt="Image" class="${m.is_hero ? "hero-media" : ''} thumb"  data-image-name="${m.name}">`

    }).join('')}</div>`)

    function isVideo(path){
        return /\.([mov]|[flv]|[mpg]|[wmv]|[mp4]|[avi])\w+/.test(path)
    }
    let hero = $('.media-control').children('.hero-media')
    console.log(72, hero)
    if(hero.length){
        hero.addClass('thumb-active');
    }else{
        $('.media-control').children().first().addClass('thumb-active')
    }

    $('.media-control').on('wheel', e => scrollContainerHorizontally(e, $('.media-control')))


    let videoPlayerBox = $('.video-player');
    let mediaControllerBox = $('.media-control');

    mediaControllerBox.children('img, video').on('click', e => {
        
        e.preventDefault();

        videoPlayerBox.html('')

        let ct = $(e.currentTarget);

        $('.thumb-active').removeClass('thumb-active')

        ct.addClass('thumb-active')

        let tagName = ct.prop('tagName');

        let path;
        if(tagName === 'IMG'){

            path = ct.attr('src');

            videoTargetBox.css('background', `url(${path}) center`);
            // Hide the video plaer container
            videoPlayerBox.addClass('hide');

            videoPlayerBox.removeClass('video-bg');

            mediaControllerBox.removeClass('video-bg');

            return

        }

        path = ct.children('source').attr('src')

        videoPlayerBox
            .html(`<video controls>
            <source src="${path}" type="video/${path.substring(path.lastIndexOf('.') + 1)}">
        </video>`).addClass('video-bg').children('video').children('source');
        videoPlayerBox.removeClass('hide')

        mediaControllerBox.addClass('video-bg');

        


        console.log(e)

    })

    box.children('.box-content').children('.tile').addClass('tile-blow-up')

    // Resize left-most tile
    setTimeout(() => box.children('.tile:first-child').addClass('tile-to-half'), 300);

    function getImgElements(){
        let el = '';
        project.students.forEach(student => {
            let img = '';
            student.profilePhoto ? img = `<img class="project-student" src=${student.profilePhoto.path} data-image-name="${student.profilePhoto.name}">` : img = `<div class="project-student student-image-none"></div>`;

            el += (`
                <div class="prof">
                    <span class="hide">${student.id}</span>
                    ${img}
                    <span class="project-collaborator-name">
                        ${student.first_name}
                    </span>
                    <span class="hide project-collaborator-desc">${student.biography}</span>`);
                    
            if(student.linkedin){

                let link = getLinkDomain(student.linkedin, '.');
                el +=   `<a class="linkedin-link hide" href="//${link}" target="_blank" title="${student.first_name}'s LinkedIn">
                            <img src='/public/images/icons/${link ? link : 'link'}.png'>
                        </a>`;
            }
                
            el += `</div>`;
        

 
        })
        return el;
    }

    // Set the Project details
    box.append(`<div class="tile-column hide">
        <div class="tile project-desc">
            <h3 class="p-title">${project.title}</h3>
            <p class="p-desc">${project.description}</p>
            <p class="p-details">A ${project.project_type} project created on ${moment(new Date(project.project_date)).format('ddd Do MMM YYYY')}</p>
        </div>
        <div class="tile d-f fd-row project-students scroll-box">
                ${getImgElements()}
            
        </div>
    </div>`);

    $('.tile-header').addClass('hide')


    const profCard = $('.prof-card');

    let clear;

    $('.project-students')
        .on('wheel', e => scrollContainerHorizontally(e, $('.project-students')))
        .children('.prof')
            .on('mouseover', e => {

                let ct = $(e.currentTarget);

                // let w = /[0-9]{0,}/g.exec(ct.css('width'))

                // let ctW = w / 2;

                // let container = ct.parents('.project-students');

                // let cW = /[0-9]{0,}/g.exec(container.css('width'));

                // // w = 461, offsetLeft = 501

                // let childrenBefore = container.children().length - (ct.index() === 0 ? 1 : ct.index())

                // let distFromLeftEdge = childrenBefore * w;

                // Move Student-Prof outside of body place where current XandY + 2/3rem

               profCard.fadeIn().removeClass('hide').html($(e.currentTarget).html()).children('span:last-child').removeClass('hide')
               profCard.children('a:last-child').removeClass('hide')
               profCard.children('span:nth-last-child(2)').removeClass('hide')
               profCard.css('top', (ct.offset().top - 320))
               let x = ct.offset().left;
               profCard.css('left', (x - 60)> window.innerWidth-225 ? window.innerWidth-225 : x - 60)
               profCard.css('display', 'flex')

            })
            .on('mouseleave', e => {
                console.log($(e.target), $(e.currentTarget), $(e.target).parents('.prof-card'))
                
                clearTimeout(clear);
                if(!$(e.currentTarget).parents('.prof-card').length){
                    clear = setTimeout(() => {

                        profCard.html('').fadeOut().addClass('hide')
    
                    }, 3000)
                }


                
            });

        $('.prof-card').on('mouseenter', e => {
            
            if($(e.currentTarget).hasClass('prof-card')) return clearTimeout(clear);

            clear = setTimeout(() => profCard.html('').fadeOut().addClass('hide'), 3000)

        })

        $('.prof-card').on('mouseleave', e => {
  
            clear = setTimeout(() => profCard.html('').fadeOut().addClass('hide'), 3000)

        })

    profCard.on('mouseenter', e => clearTimeout(clear))
    

    $('.tile-column').fadeIn().css('display', 'flex').removeClass('hide')
    
    getContentUris();
    // Create the Student elements

}

async function searchProjects(e, start, end, page, totalRows, append, signal){

    try {

        $('.floating-box').addClass('hide');
        $('.frost').addClass('hide');
        $('body').removeClass('mob-no-scroll-y');
        
        e?.preventDefault();

        console.log(306, start, end, page)

        if(isNaN(Number(start))) start = 1;

        if(isNaN(Number(end)) || !end) end = 7;

        let queryString = await newFilteredSearch();


        let apiRes = await fetch(`/project/search?start=${start}&end=${end}${queryString ? `&${queryString}` : ''}`, { signal });

        let status = apiRes.status;

        apiRes = await apiRes.json();

        const container = $('.tile-container');

        !append ? container.html('') : false;

        let { start: s, end: en, page: p, Data:data, totalRows: tr } = apiRes;

        if(data?.length){

            data.map(p => {

                let photo = p.media?.filter(m => m.is_hero)[0];
                console.log(photo)
                if(!photo && p.media.length){
                    photo = p.media[0];
                }else if(!p.media.length){
                    photo = 'none';
                }
                let tileId = `tile-${new Date().getTime()}-${p.id}`;
                container.append(`
                <div class="tile tile-bg" id="${tileId}" style="background: url(${photo?.path})" data-image-name="${photo.name}">
                    <h6 class="tile-header">${p.title}</h6>
                </div>`
                );

                $(`#${tileId}`).on('click', e => expandTile(e, p))

            })


        }

        await getContentUris();

        return  {
            start: s,
            end: en,
            page: p,
            totalRows: tr
        }


    } catch (e) {
        console.log(e)
        //newNotificationMessage(e.message, 'error')
    }

}

function closeFloatingContainer(){
    $('body').removeClass('mob-no-scroll-y');
    $('.prof-card').addClass('hide');
    $('.floating-box').addClass('hide');
    $('.tile-blow-up').removeClass('tile-blow-up');
    $('.frost').addClass('hide');
    $('.tile-header').removeClass('hide');
    $('.expanded').removeClass('expanded');
    
}

function changeFloatingContainer(e, event){

    $('.prof-card').addClass('hide')
    
    let ct = $(e.currentTarget);

    // console.log(ct.prev().children('.tile').attr('data-tile-index'))

    // let tileIndex = Number(ct.parent().prev().children('.tile').attr('data-tile-index'));
    // console.log(tileIndex, tileIndex === 0 ? 1 : tileIndex)
    // // If it's previous, attempt to retrieve the previous child
    // tileIndex = (tileIndex === 0 ? 1 : tileIndex);
    // let nextIndex = tileIndex += (event === 'Next' ?  1 : -1 )
    // let domQueryStr = `:nth-child(${nextIndex})`;
    // if(nextIndex === 0) domQueryStr = ':first-child' ;

    // console.log(domQueryStr)

    let currentTileInBox = $('.tile-container').children('.expanded');

    let subsequentEl = currentTileInBox[event === 'Next' ? 'next' : 'prev']();

    if(subsequentEl.length){
        subsequentEl.trigger('click')
    }
    getContentUris();

}