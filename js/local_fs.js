
/**
* Handle planetary dicatator functionality when dealing with the local filesystem
*/
var localFs = {
    /**
    * Open a file using the system default associated application
    *
    * @param string filePath
    */
    openFile: function( filePath ) {
        shell.openItem( filePath );
    },

    /**
    * Get the file info for a file or directory on the local filesystem
    *
    * @param string filePath
    * @param string fsElm
    **/
    fileInfo: function( filePath, fsElm ) {

        return fileSystem.stat( filePath ).then( function( fileDets ) {
            var filePerms = '0' + (fileDets.mode & 0777).toString(8)

            var objType = 'Unknown';

            if (fileDets.isDirectory()) {
                var objType = 'Directory';                
            }

            if (fileDets.isFile()) {
                var objType = 'File';                
            }

            if (fileDets.isSymbolicLink()) {
                var objType = 'Link';                
            }            

            return {
            	"file_path": filePath,
            	"obj_type": objType,
            	"file_size": fileDets.size,
            	"file_perms": filePerms,
            	"file_created": fileDets.birthtime.toLocaleString()
            }            

        });
    },    
}