import { bindFn } from './util.js';

window.addEventListener('load', async e => {

    bindFn(document.getElementById('paneHeader'), showHideSearchPane);

    await searchProjects();


})

function showHideSearchPane(e){

    let t = $(e.target).next();
   t.fadeToggle('fast', 'linear', handleFadeFinish)

    function handleFadeFinish(){
        t.css('display', 'inline-flex').toggleClass('hide');
    }
}

function expandTile(e, project){

    console.log(project)
    
    let ct = $(e.currentTarget);

    let box = $('.floating-box').removeClass('hide')

    $('.tile-blow-up').removeClass('tile-blow-up')

    $('.frost').removeClass('hide');

    box.html('')[0].appendChild(e.currentTarget)

    let videoTargetBox = box.children('.tile:first-child').children('.tile-body')

    videoTargetBox.children('.video-player').remove();
    
    videoTargetBox.append(`<div class="video-player">
    <video autoplay="true">
        <source src="/project_media/video.mp4" type="video/mp4">
    </video>
    </div>`)

    ct.addClass('tile-blow-up');

    // Resize left-most tile
    setTimeout(() => box.children('.tile:first-child').addClass('tile-to-half'), 300);

    function getImgElements(){
        let el = '';
        project.students.forEach(student => {
            el += (`
                <div>
                    <img class="project-student" src=${student.profilePhoto.path}>
                    <div class="project-collaborator">
                        ${student.first_name}
                    </div>
                </div>
                `)
        })
        return el;
    }

    // Set the Project details
    box.append(`<div class="tile-column hide">
        <div class="tile project-desc">
            <p>There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary,</p>
            <p>A ${project.project_type} project created on ${moment(new Date(project.project_date)).format('ddd Do MMM YYYY')}</p>
        </div>
        <div class="tile d-f fd-row project-students scroll-box">
                ${getImgElements()}
        </div>
    </div>`);

    $('.tile-column').fadeIn().css('display', 'flex').removeClass('hide')

    // Create the Student elements

}

async function searchProjects(searchObj, start, end, page){

    try {
        
        if(isNaN(Number(start))) start = 1;

        if(isNaN(Number(end))) end = 10;

        let apiRes = await fetch(`/project/search?start=${start}&end=${end}`);

        let status = apiRes.status;

        apiRes = await apiRes.json();

        const container = $('.tile-container');

        if(apiRes?.Data?.length){

            apiRes.Data.map(p => {

                let dispPhoto = p.media?.filter(m => m.is_hero);
                if(!dispPhoto.length && p.media.length)
                    dispPhoto = p.media[0];
                else
                    dispPhoto = 'none';

                let tileId = `tile-${new Date().getTime()}` ;

                container.append(`
                <div class="tile tile-bg" id="${tileId}" style="background: url(${dispPhoto?.path})">
                    <h6 class="tile-header">${p.title}</h6>
                </div>`
                );

                $(`#${tileId}`).on('click', e => expandTile(e, p))

            })


        }


    } catch (e) {
        console.log(e)
        //newNotificationMessage(e.message, 'error')
    }

}