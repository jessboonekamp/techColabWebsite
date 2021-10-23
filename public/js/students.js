import * as util from './util.js';
let { bindFn, getLinkDomain, showHideSearchPane, newFilteredSearch, assignInputClearEvents } = util;


window.addEventListener('load', async e => {

    
    let start = 7, end = 12, page = 2, totalRows = 0;

    let abortController = new AbortController();

    await assignInputClearEvents();

    bindFn(document.getElementsByClassName('search-filter-box')[0], showHideSearchPane);

    await searchStudents();

    $('.form-bar').on('submit', searchStudents);

    bindFn(document.getElementsByTagName('body')[0], loadDataOnScroll, null, 'wheel')

    async function loadDataOnScroll(e) {

        abortController.abort();

        abortController = new AbortController();
    
        let bodyHeight = document.getElementsByTagName('body').item(0).scrollHeight;

        if(window.innerHeight + window.scrollY == bodyHeight && (end < totalRows || !totalRows)){
            let pagination = await searchStudents(null, start, end, page, totalRows, true, abortController.signal);
            console.log('CURRENT PAGINATION: ', pagination)

            totalRows = pagination.totalRows;

            start = pagination.start += 7;

            end = start + 6;

            page = pagination.page += 1

        }
    
    }

});

async function searchStudents(e, start, end, page, totalRows, append, signal){
    try {
        
        $('.floating-box').addClass('hide');
        $('.frost').addClass('hide');

        e?.preventDefault();

        if(isNaN(Number(start))) start = 1;

        if(isNaN(Number(end))) end = 7;

        let queryString = await newFilteredSearch();

        let apiRes = await fetch(`/student/search?start=${start}&end=${end}${queryString ? `&${queryString}` : ''}`, { signal });

        let status = apiRes.status;

        apiRes = await apiRes.json();

        const container = $('.tile-container')

        !append ? container.html('') : false;

        let { start: s, end: en, page: p, Data:data, totalRows: tr } = apiRes;

        console.log(25, apiRes);
        
        apiRes.Data.forEach(({biography, first_name, id, last_name, linkedin, profilePhoto}) => {
            console.log(linkedin);
            let link = getLinkDomain(linkedin, ".");
            if(linkedin){
                linkedin = "//" + (linkedin.replace('https://', '').replace('www.', ''))
            }
            let studentCard = ``;
            linkedin ? studentCard = `<a class="student-list-card" href="${linkedin}" target="_blank">` : ``;
            studentCard += linkedin ? `<div class="w-100">` : ` <div class="student-list-card" style="">`;
            studentCard+=` <span class="hide">${id}</span>
                        <div class="student-list-background" style="background-image: url(${profilePhoto?.path})">
                            <span class="student-list-name">
                                ${first_name} ${last_name}
                            </span>
                            <span class="student-list-desc">${biography}</span>
                        </div>
                    </div>`;
            studentCard += linkedin ? `</a>` : ``;

            // linkedin ? studentCard += `<a class="linkedin-link" href="${linkedin}" target="_blank" title="April's LinkedIn">
            //                 <img src="/public/images/icons/${link}.png">
            //             </a>` : ``;
            // studentCard +=`</div>`
            
            container.append(studentCard).fadeIn();
        });

        return  {
            start: s,
            end: en,
            page: p,
            totalRows: tr
        }
        

    }catch(e){
        console.log(e);
    }
}