import os
from azure.storage.blob import BlobServiceClient
from werkzeug.utils import secure_filename
import uuid

class AzureStorageService:
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = "notes-files"
        
        if not self.connection_string:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING not set")
        
        self.blob_service_client = BlobServiceClient.from_connection_string(
            self.connection_string
        )
    
    def upload_file(self, file, user_id, course_id):
        """Upload file to Azure Blob Storage"""
        try:
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'txt'
            unique_filename = f"{user_id}/{course_id}/{uuid.uuid4()}.{file_extension}"
            
            # Get blob client
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=unique_filename
            )
            
            # Upload file
            blob_client.upload_blob(file, overwrite=True)
            
            # Return file metadata
            return {
                "url": blob_client.url,
                "filename": original_filename,
                "blob_name": unique_filename,
                "file_type": file_extension
            }
        except Exception as e:
            print(f"Azure upload error: {e}")
            raise
    
    def delete_file(self, blob_name):
        """Delete file from Azure Blob Storage"""
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            blob_client.delete_blob()
            return True
        except Exception as e:
            print(f"Azure delete error: {e}")
            return False
    
    def get_file_url(self, blob_name):
        """Get public URL for a blob"""
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            return blob_client.url
        except Exception as e:
            print(f"Azure get URL error: {e}")
            return None