package com.personaltracker.app;

import android.content.*;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;

public class NativeFileProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public Cursor query(Uri u,String[]p,String s,String[]a,String o){return new MatrixCursor(new String[]{"_display_name","_size"});}
    @Override public String getType(Uri u){return "application/octet-stream";}
    @Override public Uri insert(Uri u,ContentValues v){return null;}
    @Override public int delete(Uri u,String s,String[]a){return 0;}
    @Override public int update(Uri u,ContentValues v,String s,String[]a){return 0;}
    @Override public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{
        String path=u.getPath(); if(path==null)throw new FileNotFoundException();
        if(path.startsWith("/"))path=path.substring(1);
        File f=new File(getContext().getCacheDir(),"share/"+path);
        if(!f.exists())throw new FileNotFoundException(path);
        return ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY);
    }
    public static Uri getUriForFile(Context c,String authority,File f){
        return new Uri.Builder().scheme("content").authority(authority).path(f.getName()).build();
    }
}
