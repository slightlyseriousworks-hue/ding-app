// Ding's entry point. The reminder press task must be defined before anything else loads,
// because Android may start Ding in the background just to run it (see that file).
import './src/reminders/background-task';

// Then start the app as usual.
import 'expo-router/entry';
