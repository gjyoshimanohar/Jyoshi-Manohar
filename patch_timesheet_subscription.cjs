const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

const targetStr = `    const unsubscribeChat = onSnapshot(
      chatQuery,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ChatMessage);
        });
        list.sort((a, b) => a.createdAt - b.createdAt);
        setChatMessages(list);
        setChatMessagesLoading(false);
      },
      (error) => {
        console.error("Error reading chat: ", error);
        setChatMessagesLoading(false);
      }
    );`;

const newStr = targetStr + `

    // TIMESHEETS SUBSCRIPTION
    let unsubscribeTimesheets = () => {};
    if (isAdmin) {
      unsubscribeTimesheets = timesheetService.subscribeToUserTimesheets(user.uid, (logs) => {
        setTimesheets(logs);
      });
    }`;

code = code.replace(targetStr, newStr);

const targetCleanupStr = `      unsubscribeChat();
    };
  }, [user, selectedClientId, isAdmin]);`;

const newCleanupStr = `      unsubscribeChat();
      unsubscribeTimesheets();
    };
  }, [user, selectedClientId, isAdmin]);`;

code = code.replace(targetCleanupStr, newCleanupStr);
fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
