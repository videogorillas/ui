import {fileReader, saveFile} from "../utils/FetchUtils";

// var inputElement = document.getElementById("fileInput");
// inputElement.addEventListener("change", handleFiles, false);
//
// async function handleFiles () {
//     var fileList = this.files;
//     for await (const text of fileReader(fileList)) {
//         console.log(text);
//     }
// }


const debug = {hello : "world"};
const blob = new Blob([JSON.stringify(debug)], {type : 'application/json'});

// saveFile(blob, 'test.json');