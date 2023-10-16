import os
import sys

args = sys.argv

end = 0
char = 0
flen = 0
clinst = 0
if (len(args)>2):
    for root, dirs, files in os.walk(args[1]):
        for file in files:
            if (file.lower().endswith(args[2])):
                flen += 1
                with open(root+"/"+file) as f:
                    for l in f:
                        end+=1
                        char+=len(l)
                        if (len(args)>3):
                            clinst+=l.count(args[3])

print("lines: "+str(end)+"\nchars: "+str(char)+"\nfiles: "+str(flen) + ("\ncount("+args[3]+"): "+str(clinst) if len(args)>3 else ""))