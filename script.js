const hamburger= document.querySelector(".hamburger");
const navmenu = document.querySelector(".menu");

hamburger.addEventListener("click",()=>{
    hamburger.classList.toggle("active");
    navmenu.classList.toggle("active");
})
window.onscroll=()=>{
    navmenu.classList.remove("active");
    hamburger.classList.remove("active");
}